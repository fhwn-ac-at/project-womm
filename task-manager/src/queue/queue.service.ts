import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {

  private connection: amqp.Connection;
  private channel: amqp.Channel;

  public constructor(
    private readonly configService: ConfigService
  ) { }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  async connect() {
    this.connection = await amqp.connect(this.configService.getOrThrow('RABBITMQ_URL'));
    this.channel = await this.connection.createChannel();
  }

  async emit(queueName: string, eventName: string, message: any) {
    await this.channel.assertQueue(queueName, { durable: true });
    this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify({
      ...message
    })));
  }

  async close() {
    await this.channel.close();
    await this.connection.close();
  }
}
