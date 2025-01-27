import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as ffmpeg from 'fluent-ffmpeg';
import { AudioFileContainer, FileContainer, FileMetadata, FileType, VideoFileCodec, VideoFileContainer } from '../workspaces/entities/file-metadata.entity';
import * as path from 'path';
import { StorageService } from '../storage/storage.service';
import {v4 as uuidv4} from 'uuid';
import { S3Path } from '../types/s3Path.type';

@Injectable()
export class VideoAnalyserService {

  private readonly logger = new Logger(VideoAnalyserService.name);

  private videoCodecMap = new Map<string, VideoFileCodec>([
    ['h264', VideoFileCodec.H264],
    ['h265', VideoFileCodec.H265],
    ['vp8', VideoFileCodec.Vp8],
    ['vp9', VideoFileCodec.Vp9],
  ]);

  public constructor(
    private readonly storageService: StorageService 
  ) {}


  public async analyzeFileOfS3(fileLocator: S3Path): Promise<FileMetadata> {
    const videoPath = path.join('/tmp', uuidv4());
    await this.storageService.downloadFileToDisk(fileLocator, videoPath);

    try {
      return await this.analyzeFile(videoPath);
    } finally {
      await fs.unlink(videoPath);
    }
  }

  public async analyzeFile(videoPath: string): Promise<FileMetadata> {
    this.logger.log(`Analyzing file ${videoPath}`);
    if (!await this.fileExists(videoPath)) {
      throw new InternalServerErrorException(`File ${videoPath} does not exist`);
    }

    let data: ffmpeg.FfprobeData;
    try {
      data = await this.getFFProbeData(videoPath);
    } catch (e) {
      throw new InternalServerErrorException(`Failed to get metadata for ${videoPath}: ${e}`);
    }

    const videoStream = data.streams.find(s => s.codec_type === 'video');
    const audioStream = data.streams.find(s => s.codec_type === 'audio');

    let fileType: FileType;
    if (!videoStream && audioStream) {
      fileType = FileType.Audio;
    } else if (videoStream && audioStream) {
      fileType = FileType.Video;
    } else {
      throw new InternalServerErrorException(`File ${videoPath} does not contain audio or video streams`);
    }

    const size = data.format.size;
    const length = data.format.duration;

    let container: FileContainer;
    let videoCodec: VideoFileCodec | undefined;

    if (fileType === FileType.Video) {
      videoCodec = this.extractVideoCodec(videoStream);
      if (!videoCodec) {
        throw new InternalServerErrorException(`Unsupported video codec ${videoStream.codec_name}`);
      }

      container = this.extractVideoContainer(data);
    } else {
      if (Object.values(AudioFileContainer).includes(data.format.format_name as AudioFileContainer)) {
        container = data.format.format_name as AudioFileContainer;
      } else {
        throw new InternalServerErrorException(`Unsupported audio container ${data.format.format_name}`);
      }
    }

    return new FileMetadata({
      isSupported: true,
      type: fileType,
      container,
      codec: videoCodec,
      size,
      length,
    })
  }

  private extractVideoCodec(stream: ffmpeg.FfprobeStream): VideoFileCodec | undefined {
    const codecName = stream.codec_name;
    return this.videoCodecMap.get(codecName);
  }

  private extractVideoContainer(data: ffmpeg.FfprobeData): VideoFileContainer {

    const formats = data.format.format_name.split(',');
    for (const format of formats) {
      if (Object.values(VideoFileContainer).includes(format as VideoFileContainer)) {
        return format as VideoFileContainer;
      }
    }

    throw new InternalServerErrorException(`Could not determine video container video has formats ${formats}`);
  }


  private async getFFProbeData(videoPath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  private async fileExists(videoPath: string): Promise<boolean> {
    try {
      await fs.access(videoPath);
      return true;
    } catch (e) {
      return false;
    }
  }
}
