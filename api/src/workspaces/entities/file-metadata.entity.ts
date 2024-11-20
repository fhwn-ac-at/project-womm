import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export enum FileType {
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
}

export enum VideoFileContainer {
  Mp4 = 'mp4',
  Webm = 'webm',
  Mov = 'mov',
  Mkv = 'mkv',
}

export enum VideoFileCodec {
  H264 = 'h264',
  H265 = 'h265',
  Vp8 = 'vp8',
  Vp9 = 'vp9',
}

export enum ImageFileContainer {
  Jpeg = 'jpeg',
  Png = 'png',
  Gif = 'gif',
  Webp = 'webp',
}


export enum AudioFileContainer {
  Mp3 = 'mp3',
  Wav = 'wav',
  Aac = 'aac',
}

export type FileContainer = VideoFileContainer | ImageFileContainer | AudioFileContainer;

export type FileMetadataConstructor =
  | { type: FileType.Video; container: VideoFileContainer; codec: VideoFileCodec, size: number, length: number }
  | { type: FileType.Image; container: ImageFileContainer; codec: undefined, size: number, length: undefined }
  | { type: FileType.Audio; container: AudioFileContainer; codec: undefined, size: number, length: number };

/**
 * Class representing the metadata of a file.
 */
@Schema()
export class FileMetadata {

  constructor({ type, container, codec }: FileMetadataConstructor) {
    this.type = type;
    this.container = container;
    this.codec = codec;
  }

  /**
   * The type of the file.
   */
  @Prop({
    type: String,
    enum: FileType,
  })
  type: FileType;

  /**
   * The container of the file.
   */
  @Prop({
    type: String,
    enum: { ...VideoFileContainer, ...ImageFileContainer, ...AudioFileContainer },
  })
  container: FileContainer;

  /**
   * The codec of the file (only applicable for video files).
   */
  @Prop({
    type: String,
    enum: VideoFileCodec,
  })
  codec?: VideoFileCodec;

  /**
   * The size of the file in bytes.
   */
  @Prop()
  size: string;

  /**
   * The length of the file (only applicable for video and audio files).
   */
  @Prop()
  length?: number;
}

export const FileMetadataSchema = SchemaFactory.createForClass(FileMetadata);