import { Test, TestingModule } from '@nestjs/testing';
import { ConsoleLogger, INestApplication, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { MongoClient } from 'mongodb';
import * as amqp from 'amqplib';
import { internalBootstrap } from '../src/bootstrapper';
import { Workspace } from '../src/workspaces/entities/workspace.entity';
import { AddFileDto } from '../src/workspaces/dto/add-file.dto';
import { RegisteredUpload } from '../src/upload/entities/upload.entity';
import * as AWS from 'aws-sdk';
import { createHash, randomBytes } from 'crypto';
import { Scene } from '../src/scenes/entities/scene.entity';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mongoClient: MongoClient;
  let connection: amqp.Connection;
  let channel: amqp.Channel;
  let s3: AWS.S3;
  const consumerTags: string[] = [];

  const bucketName = process.env.S3_BUCKET_NAME ?? 'workspaces';
  const uuidv4Regex = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

  beforeAll(async () => {
    // Connect to MongoDB
    mongoClient = await MongoClient.connect(process.env.MONGO_CONNECTION);

    // Connect to RabbitMQ
    connection = await amqp.connect(process.env.RABBITMQ_URL);

    // Initialize S3 client
    s3 = new AWS.S3({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint: process.env.S3_ENDPOINT,
      s3ForcePathStyle: true,
    });

    try {
      await s3.createBucket({ Bucket: bucketName }).promise();
    } catch (err) { }
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).setLogger(new ConsoleLogger()).compile();
    channel = await connection.createChannel();

    app = moduleFixture.createNestApplication();

    internalBootstrap(app);

    await app.startAllMicroservices();
    await app.init();
  });

  afterEach(async () => {
    // Clean MongoDB collections
    const db = mongoClient.db();
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }

    for (const tag of consumerTags) {
      await channel.cancel(tag);
    }
    consumerTags.length = 0;

    // Clean RabbitMQ queues
    await channel.deleteQueue('task_events');
    await channel.deleteQueue('artifact_events');
    await channel.deleteQueue('worker_events');
    await channel.deleteQueue('worker');
    await channel.close();

    // Clean S3 bucket
    const objects = await s3
      .listObjectsV2({ Bucket: bucketName })
      .promise();

    if (objects.Contents && objects.Contents.length > 0) {
      await s3
        .deleteObjects({
          Bucket: bucketName,
          Delete: {
            Objects: objects.Contents.map((obj) => ({ Key: obj.Key })),
          },
        })
        .promise();
    }

    await app.close();
  });

  afterAll(async () => {
    await mongoClient.close();
    await connection.close();
  });

  it('/api/v1/workspaces (POST) should create a workspace ', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

    const workspace = res.body as Workspace;
    expect(workspace.id).toMatch(uuidv4Regex);
    expect(workspace.files).toEqual([]);
  });

  it('/api/v1/workspaces (GET) should return no workspaces if there are none', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/workspaces')
      .expect(200)
      .expect([]);
  });

  it('/api/v1/workspaces (GET) should return all workspaces', async () => {
    const workspaces: Workspace[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .expect(201);

      workspaces.push(res.body as Workspace);
    }

    const res = await request(app.getHttpServer())
      .get('/api/v1/workspaces')
      .expect(200);

    expect(res.body).toEqual(workspaces);
  });

  it('/api/v1/workspaces/:workspaceId (GET) should return 404 if workspace does not exist', async () => {
    return await request(app.getHttpServer())
      .get('/api/v1/workspaces/123')
      .expect(404);
  });

  it('/api/v1/workspaces/:workspaceId (GET) should return a workspace', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

    const workspace = res.body as Workspace;

    const res2 = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspace.id}`)
      .expect(200);

    expect(res2.body).toEqual(workspace);
  });

  it('/api/v1/workspaces/:workspaceId/files (PUT) should add a file to a workspace and register a file upload', async () => {
    const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

    const workspace = workspaceRes.body as Workspace;

    const file: AddFileDto = {
      name: 'test-file.txt',
      fileSize: 100
    };

    const res = await request(app.getHttpServer())
      .put(`/api/v1/workspaces/${workspace.id}/files`)
      .send(file)
      .expect(200);

    expect(res.body.uploadId).toMatch(uuidv4Regex);
    expect(res.body.expectedSize).toBe(file.fileSize);
    expect(res.body.uploadedSize).toBe(0);

    const workspaceRes2 = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspace.id}`)
      .expect(200);

    const workspace2 = workspaceRes2.body as Workspace;
    expect(workspace2.files).toHaveLength(1);
    expect(workspace2.files[0].name).toBe(file.name);
    expect(workspace2.files[0].uploadId).toBe(res.body.uploadId);

    const uploadReg = await request(app.getHttpServer())
      .get(`/api/v1/uploads/${res.body.uploadId}`)
      .expect(200);

    const upload = uploadReg.body as RegisteredUpload;
    expect(upload.expectedSize).toBe(file.fileSize);
    expect(upload.uploadedSize).toBe(0);
    expect(upload.parts).toEqual([]);
    expect(upload.uploadId).toBe(res.body.uploadId);
    expect(upload.maxPartSize).toBe(64 * 1024 * 1024);
  });

  it('/api/v1/workspaces/:workspaceId/files (PUT) should return 404 if workspace does not exist', async () => {
    const file: AddFileDto = {
      name: 'test-file.txt',
      fileSize: 100
    };
    return await request(app.getHttpServer())
      .put('/api/v1/workspaces/123/files')
      .send(file)
      .expect(404);
  });

  it('/api/v1/uploads/:uploadId (GET) should return 404 if upload does not exist', async () => {
    return await request(app.getHttpServer())
      .get('/api/v1/uploads/123')
      .expect(404);
  });

  it('/api/v1/uploads/:uploadId/part (PUT) should finish the file if the upload, size has been reached.', async () => {
    const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

    const workspace = workspaceRes.body as Workspace;
    const fileBuffer = Buffer.from('this is a test file', 'utf-8');
    const addFile: AddFileDto = {
      name: 'test-file.txt',
      fileSize: fileBuffer.byteLength
    };

    const uploadRes = await request(app.getHttpServer())
      .put(`/api/v1/workspaces/${workspace.id}/files`)
      .send(addFile)
      .expect(200);

    const upload = uploadRes.body as RegisteredUpload;

    const partRes = await request(app.getHttpServer())
      .post(`/api/v1/uploads/${upload.uploadId}/part`)
      .attach('part', fileBuffer, 'test-file.txt')
      .field('partNumber', '1')

    const finishedUpload = partRes.body as RegisteredUpload;
    expect(finishedUpload.uploadedSize).toBe(finishedUpload.expectedSize);
    expect(finishedUpload.parts).toHaveLength(1);
    expect(finishedUpload.parts[0]).toEqual({ partNumber: 1, partSize: fileBuffer.byteLength, status: 'completed' });

    // search for a file in s3 and check if it has the right content.
    const s3Objects = await s3.listObjectsV2({ Bucket: bucketName }).promise();
    const s3Files = s3Objects.Contents;
    expect(s3Files).toHaveLength(1);
    expect(s3Files[0].Key).toContain('test-file.txt');

    // get the file from s3
    const s3File = await s3.getObject({ Bucket: bucketName, Key: s3Files[0].Key }).promise();
    expect(s3File.Body).toEqual(fileBuffer);
  });

  it('/api/v1/uploads/:uploadId/part (PUT) should return 404 if upload does not exist', async () => {
    const fileBuffer = Buffer.from('this is a test file', 'utf-8');
    return await request(app.getHttpServer())
      .post('/api/v1/uploads/123/part')
      .attach('part', fileBuffer, 'test-file.txt')
      .field('partNumber', '1')
      .expect(404);
  });

  it('/api/v1/uploads/:uploadId/part (PUT) should put together large files in the right way.', async () => {
    const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

    const workspace = workspaceRes.body as Workspace;
    const fileBuffer = randomBytes(1024 * 1024 * 100); // 100MB
    const addFile: AddFileDto = {
      name: 'test-file.txt',
      fileSize: fileBuffer.byteLength
    };

    const uploadRes = await request(app.getHttpServer())
      .put(`/api/v1/workspaces/${workspace.id}/files`)
      .send(addFile)
      .expect(200);

    const upload = uploadRes.body as RegisteredUpload;
    expect(upload.expectedSize).toBe(fileBuffer.byteLength);
    expect(upload.uploadedSize).toBe(0);
    expect(upload.parts).toEqual([]);
    expect(upload.uploadId).toMatch(uuidv4Regex);
    expect(upload.maxPartSize).toBeDefined();

    const maxPartSize = upload.maxPartSize;
    let partNumber = 1;
    for (let offset = 0; offset < fileBuffer.byteLength; offset += maxPartSize) {
      const chunk = fileBuffer.subarray(offset, offset + maxPartSize);

      const partRes = await request(app.getHttpServer())
        .post(`/api/v1/uploads/${upload.uploadId}/part`)
        .attach('part', chunk, 'test-file.txt')
        .field('partNumber', partNumber.toString());

      const finishedUpload = partRes.body as RegisteredUpload;
      expect(finishedUpload.uploadedSize).toBe(offset + chunk.byteLength);
      expect(finishedUpload.parts).toHaveLength(partNumber);
      expect(finishedUpload.parts[partNumber - 1]).toEqual({ partNumber: partNumber, partSize: chunk.byteLength, status: 'completed' });
      partNumber++;
    }

    // get the upload again
    const finishedUpload = (await request(app.getHttpServer())
      .get(`/api/v1/uploads/${upload.uploadId}`)
      .expect(200)).body;
    expect(finishedUpload.uploadedSize).toBe(fileBuffer.byteLength);


    // search for a file in s3 and check if it has the right content.
    const s3Objects = await s3.listObjectsV2({ Bucket: bucketName }).promise();
    const s3Files = s3Objects.Contents;
    expect(s3Files).toHaveLength(1);
    expect(s3Files[0].Key).toContain('test-file.txt');

    // get the file from s3
    const s3File = await s3.getObject({ Bucket: bucketName, Key: s3Files[0].Key }).promise();
    const fileBufferHash = createHash('sha256').update(fileBuffer).digest('hex');
    const s3FileHash = createHash('sha256').update(s3File.Body as Buffer).digest('hex');
    expect(fileBufferHash).toEqual(s3FileHash);
  });

  describe('Scene Creation and Deletion API', () => {

    it('/api/v1/scenes (POST) should create a scene when using an empty workspace', async () => {
      const res = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);
      console.dir(res.body, { depth: null });

      const workspace = res.body as Workspace;
      expect(workspace.id).toMatch(uuidv4Regex);
      expect(workspace.files).toEqual([]);

      const rawScene = {
        scene: {
          version: 1,
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          workspace: {
            id: workspace.id
          },
          clips: [],
          layers: []
        }
      }

      const sceneRes = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(201);
      const scene = sceneRes.body as Scene;
      expect(scene.id).toMatch(uuidv4Regex);
      expect(scene.version).toBe(1);
      expect(scene.video.name).toBe('test.mp4');        
      expect(scene.video.container).toBe('mp4');   
      expect(scene.workspace.id).toBe(workspace.id);
      expect(scene.clips).toEqual([]);
      expect(scene.layers).toEqual([]);
    });

    it('/api/v1/scenes (POST) should return 404 when the workspace does not exist', async () => {
      const rawScene = {
        scene: {
          version: 1,
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          workspace: {
            id: 'eb0d69bf-b16d-4732-9f57-9184bd271853'
          },
          clips: [],
          layers: []
        }
      }

      const res = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        // .expect(404);

    });

    it('/api/v1/scenes (POST) create a scene when using a workspace that has fully uploaded files', async () => {
      const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

      const workspace = workspaceRes.body as Workspace;
      const fileBuffer = Buffer.from('this is a test file', 'utf-8');
      const addFile: AddFileDto = {
        name: 'main.txt',
        fileSize: fileBuffer.byteLength
      };

      const uploadRes = await request(app.getHttpServer())
        .put(`/api/v1/workspaces/${workspace.id}/files`)
        .send(addFile)
        .expect(200);

      const upload = uploadRes.body as RegisteredUpload;

      const partRes = await request(app.getHttpServer())
        .post(`/api/v1/uploads/${upload.uploadId}/part`)
        .attach('part', fileBuffer, 'main.txt')
        .field('partNumber', '1')

      const finishedUpload = partRes.body as RegisteredUpload;
      expect(finishedUpload.uploadedSize).toBe(finishedUpload.expectedSize);
      expect(finishedUpload.parts).toHaveLength(1);
      expect(finishedUpload.parts[0]).toEqual({ partNumber: 1, partSize: fileBuffer.byteLength, status: 'completed' });

      // search for a file in s3 and check if it has the right content.
      const s3Objects = await s3.listObjectsV2({ Bucket: bucketName }).promise();
      const s3Files = s3Objects.Contents;
      expect(s3Files).toHaveLength(1);
      expect(s3Files[0].Key).toContain('main.txt');

      // get the file from s3
      const s3File = await s3.getObject({ Bucket: bucketName, Key: s3Files[0].Key }).promise();
      expect(s3File.Body).toEqual(fileBuffer);

      // workspace setup finsihed, now create a scene
      const rawScene = {
        scene: {
          version: 1,
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          workspace: {
            id: workspace.id
          },
          clips: [
            {
              id: 'main.txt',
              name: 'Main part'
            }
          ],
          layers: []
        }
      }

      const sceneRes = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(201);

      const scene = sceneRes.body as Scene;
      expect(scene.id).toMatch(uuidv4Regex);
      expect(scene.version).toBe(1);
      expect(scene.video.name).toBe('test.mp4');        
      expect(scene.video.container).toBe('mp4');   
      expect(scene.workspace.id).toBe(workspace.id);
      expect(scene.clips).toEqual([
        {
          id: 'main.txt',
          name: 'Main part'
        }
      ]);
      expect(scene.layers).toEqual([]);
    });

    it('/api/v1/scenes (POST) create a scene when using a workspace that has not fully uploaded files', async () => {
      const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

      const workspace = workspaceRes.body as Workspace;
      const fileBuffer = Buffer.from('this is a test file', 'utf-8');
      const addFile: AddFileDto = {
        name: 'main.txt',
        fileSize: fileBuffer.byteLength
      };

      const uploadRes = await request(app.getHttpServer())
        .put(`/api/v1/workspaces/${workspace.id}/files`)
        .send(addFile)
        .expect(200);

      // workspace setup finsihed, now create a scene
      const rawScene = {
        scene: {
          version: 1,
          workspace: {
            id: workspace.id
          },
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          clips: [
            {
              id: 'main.txt',
              name: 'Main part'
            }
          ],
          layers: []
        }
      }

      const sceneRes = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(201);

      const scene = sceneRes.body as Scene;
      expect(scene.id).toMatch(uuidv4Regex);
      expect(scene.version).toBe(1);
      expect(scene.video.name).toBe('test.mp4');        
      expect(scene.video.container).toBe('mp4');   
      expect(scene.workspace.id).toBe(workspace.id);
      expect(scene.clips).toEqual([
        {
          id: 'main.txt',
          name: 'Main part'
        }
      ]);
      expect(scene.layers).toEqual([]);
    });

    it('/api/v1/scenes (POST) should return 404 when a clip is not found in the workspace', async () => {
      const workspaceRes = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

      const workspace = workspaceRes.body as Workspace;

      const rawScene = {
        scene: {
          version: 1,
          workspace: {
            id: workspace.id
          },
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          clips: [
            {
              id: 'main.txt',
              name: 'Main part'
            }
          ],
          layers: []
        }
      }

      const res = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(409);

      expect(res.body.message).toBe('Clip with ID main.txt not found in workspace');
    });

    it('/api/v1/scenes/:sceneId (GET) should return 404 when the scene does not exist', async () => {
      return await request(app.getHttpServer())
        .get('/api/v1/scenes/123')
        .expect(404);
    });

    it('/api/v1/scenes/:sceneId (GET) should return a scene', async () => {
      const res = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

      const workspace = res.body as Workspace;
      expect(workspace.id).toMatch(uuidv4Regex);
      expect(workspace.files).toEqual([]);

      const rawScene = {
        scene: {
          version: 1,
          workspace: {
            id: workspace.id
          },
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          clips: [],
          layers: []
        }
      }

      const sceneRes = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(201);
      const scene = sceneRes.body as Scene;
      expect(scene.id).toMatch(uuidv4Regex);
      expect(scene.version).toBe(1);
      expect(scene.video.name).toBe('test.mp4');        
      expect(scene.video.container).toBe('mp4');   
      expect(scene.workspace.id).toBe(workspace.id);
      expect(scene.clips).toEqual([]);
      expect(scene.layers).toEqual([]);

      const sceneRes2 = await request(app.getHttpServer())
        .get(`/api/v1/scenes/${scene.id}`)
        .expect(200);
      const scene2 = sceneRes2.body as Scene;
      
      expect(scene2.id).toMatch(uuidv4Regex);
      expect(scene2.version).toBe(1);
      expect(scene.video.name).toBe('test.mp4');        
      expect(scene.video.container).toBe('mp4');   
      expect(scene2.workspace.id).toBe(workspace.id);
      expect(scene2.clips).toEqual([]);
      expect(scene2.layers).toEqual([]);
    });

    it('/api/v1/scenes/:sceneId (DELETE) should return 404 when the scene does not exist', async () => {
      return await request(app.getHttpServer())
        .delete('/api/v1/scenes/123')
        .expect(404);
    });

    it('/api/v1/scenes/:sceneId (DELETE) should delete a scene', async () => {
      const res = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

      const workspace = res.body as Workspace;
      expect(workspace.id).toMatch(uuidv4Regex);
      expect(workspace.files).toEqual([]);

      const rawScene = {
        scene: {
          version: 1,
          workspace: {
            id: workspace.id
          },
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          clips: [],
          layers: []
        }
      }

      const sceneRes = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(201);
      const scene = sceneRes.body as Scene;
      expect(scene.id).toMatch(uuidv4Regex);
      expect(scene.version).toBe(1);
      expect(scene.workspace.id).toBe(workspace.id);
      expect(scene.clips).toEqual([]);
      expect(scene.layers).toEqual([]);

      await request(app.getHttpServer())
        .delete(`/api/v1/scenes/${scene.id}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/scenes/${scene.id}`)
        .expect(404);
    });

    it('/api/v1/scenes (GET) should return two scenes', async () => {
      const res = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

      const workspace = res.body as Workspace;
      expect(workspace.id).toMatch(uuidv4Regex);
      expect(workspace.files).toEqual([]);

      const rawScene = {
        scene: {
          version: 1,
          workspace: {
            id: workspace.id
          },
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          clips: [],
          layers: []
        }
      }

      const sceneRes = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(201);
      const scene = sceneRes.body as Scene;
      expect(scene.id).toMatch(uuidv4Regex);
      expect(scene.version).toBe(1);
      expect(scene.video.name).toBe('test.mp4');        
      expect(scene.video.container).toBe('mp4');   
      expect(scene.workspace.id).toBe(workspace.id);
      expect(scene.clips).toEqual([]);
      expect(scene.layers).toEqual([]);

      const sceneRes2 = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(201);
      const scene2 = sceneRes2.body as Scene;
      expect(scene.id).toMatch(uuidv4Regex);
      expect(scene.version).toBe(1);
      expect(scene.video.name).toBe('test.mp4');        
      expect(scene.video.container).toBe('mp4');   
      expect(scene.workspace.id).toBe(workspace.id);
      expect(scene.clips).toEqual([]);
      expect(scene.layers).toEqual([]);

      const allScenesRes = await request(app.getHttpServer())
        .get('/api/v1/scenes')
        .expect(200);

      const allScenes = allScenesRes.body as Scene[];

      expect(allScenes).toHaveLength(2);
      expect(allScenes[0]).toEqual(scene);
      expect(allScenes[1]).toEqual(scene2);
    });

    it('/api/v1/scenes/:sceneId (PATCH) should update a scenes video name and container', async () => {
      const res = await request(app.getHttpServer())
      .post('/api/v1/workspaces')
      .expect(201);

      const workspace = res.body as Workspace;
      expect(workspace.id).toMatch(uuidv4Regex);
      expect(workspace.files).toEqual([]);

      const rawScene = {
        scene: {
          version: 1,
          video: {
            name: 'test.mp4',
            container: 'mp4'
          },
          workspace: {
            id: workspace.id
          },
          clips: [],
          layers: []
        }
      }

      const sceneRes = await request(app.getHttpServer())
        .post('/api/v1/scenes')
        .send(rawScene)
        .expect(201);
      const scene = sceneRes.body as Scene;
      console.dir(scene, { depth: null });
      expect(scene.id).toMatch(uuidv4Regex);
      expect(scene.version).toBe(1);
      expect(scene.video.name).toBe('test.mp4');        
      expect(scene.video.container).toBe('mp4');        
      expect(scene.workspace.id).toBe(workspace.id);
      expect(scene.clips).toEqual([]);
      expect(scene.layers).toEqual([]);

      const updatedScene = {
        scene: {
          video: {
            name: 'new.mov',
            container: 'mov'
          }
        }
      }

      const updatedSceneRes = await request(app.getHttpServer())
        .patch(`/api/v1/scenes/${scene.id}`)
        .send(updatedScene)
        .expect(200);

      const updatedSceneBody = updatedSceneRes.body as Scene;
      expect(updatedSceneBody.id).toMatch(uuidv4Regex);
      expect(updatedSceneBody.version).toBe(1);
      expect(updatedSceneBody.video.name).toBe('new.mov');        
      expect(updatedSceneBody.video.container).toBe('mov');        
      expect(updatedSceneBody.workspace.id).toBe(workspace.id);
      expect(updatedSceneBody.clips).toEqual([]);
      expect(updatedSceneBody.layers).toEqual([]);
    });

    describe.only('Scene Modification API', () => {
      let workspace: Workspace;
      let scene: Scene;

      beforeEach(async () => {
        const res = await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .expect(201);
  
        workspace = res.body as Workspace;
  
        const rawScene = {
          scene: {
            version: 1,
            video: {
              name: 'test.mp4',
              container: 'mp4'
            },
            workspace: {
              id: workspace.id
            },
            clips: [],
            layers: []
          }
        }
  
        const sceneRes = await request(app.getHttpServer())
          .post('/api/v1/scenes')
          .send(rawScene)
          .expect(201);
        scene = sceneRes.body as Scene;
      });

      it('/api/v1/scenes/:sceneId/layers (PUT) should add a layer to a scene', async () => {
        const res = await request(app.getHttpServer())
          .put(`/api/v1/scenes/${scene.id}/layers`)
          .expect(200);

        console.dir(res.body, { depth: null });

        const updatedScene = res.body as Scene;
        expect(updatedScene.layers).toHaveLength(1);
        expect(updatedScene.layers[0].clips).toEqual([]);
      });

      it('/api/v1/scenes/:sceneId/layers (PUT) should be able to add multiple layers', async () => {
        await request(app.getHttpServer())
          .put(`/api/v1/scenes/${scene.id}/layers`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .put(`/api/v1/scenes/${scene.id}/layers`)
          .expect(200);
        console.dir(res.body, { depth: null });

        const updatedScene = res.body as Scene;
        expect(updatedScene.layers).toHaveLength(2);
        expect(updatedScene.layers[0].clips).toEqual([]);
        expect(updatedScene.layers[1].clips).toEqual([]);
      });

      it('/api/v1/scenes/:sceneId/layers (PUT) should return 404 when the scene does not exist', async () => {
        return await request(app.getHttpServer())
          .put('/api/v1/scenes/123/layers')
          .expect(404);
      });

      it('/api/v1/scenes/:sceneId/layers/:layerIndex (DELETE) should remove a layer from a scene', async () => {
        await request(app.getHttpServer())
          .put(`/api/v1/scenes/${scene.id}/layers`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .delete(`/api/v1/scenes/${scene.id}/layers/0`)
          .expect(200);

        const updatedScene = res.body as Scene;
        expect(updatedScene.layers).toHaveLength(0);
      });

      it('/api/v1/scenes/:sceneId/layers/:layerIndex (DELETE) should return 404 when the scene does not exist', async () => {
        return await request(app.getHttpServer())
          .delete('/api/v1/scenes/123/layers/0')
          .expect(404);
      });

      it('/api/v1/scenes/:sceneId/layers/:layerIndex (DELETE) should return 404 when the layer does not exist', async () => {
        return await request(app.getHttpServer())
          .delete(`/api/v1/scenes/${scene.id}/layers/0`)
          .expect(404);
      });

      it('/api/v1/scenes/:sceneId/layers/:layerIndex (DELETE) should only remove one index', async () => {
        await request(app.getHttpServer())
          .put(`/api/v1/scenes/${scene.id}/layers`)
          .expect(200);

        await request(app.getHttpServer())
          .put(`/api/v1/scenes/${scene.id}/layers`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .delete(`/api/v1/scenes/${scene.id}/layers/1`)
          .expect(200);

        
        const updatedScene = res.body as Scene;
        expect(updatedScene.layers).toHaveLength(1);
        expect(updatedScene.layers[0].clips).toEqual([]);
      });

      it('/api/v1/scenes/:sceneId/layers/:layerIndex/clips (PUT) should add a clip to a layer', async () => {
        await request(app.getHttpServer())
          .put(`/api/v1/scenes/${scene.id}/layers`)
          .expect(200);

        const clip = {
          id: 'main.txt',
          name: 'Main part'
        }

        const res = await request(app.getHttpServer())
          .put(`/api/v1/scenes/${scene.id}/layers/0/clips`)
          .send(clip)
          .expect(200);

        const updatedScene = res.body as Scene;
        expect(updatedScene.layers[0].clips).toEqual([clip]);
      });


    });
  });
});
