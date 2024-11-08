
import * as amqp from 'amqplib';

export async function getOneMessageFrom<T>(connection: amqp.Connection, queue: string): Promise<T | null> {
  return await new Promise<T | null>(async (resolve) => {
    const channel = await connection.createChannel();
    channel.prefetch(1);
    channel.consume(
      queue,
      (msg) => {
        if (msg) {
          try {
            const parsedMessage = JSON.parse(msg.content.toString()); // Parse JSON string
            resolve(parsedMessage as T); // Cast to ScheduledTaskDto
          } catch (error) {
            console.error('Failed to parse message content', error);
            resolve(null); // Return null if parsing fails
          }
          channel.ack(msg); // Acknowledge the message
        } else {
          resolve(null);
        }
        channel.close();
      },
      { noAck: false }
    );
  })
}
