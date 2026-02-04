import amqp, { type ConsumeMessage, type Channel, type ChannelModel } from "amqplib";

export interface RabbitMQConfig {
  url: string;
  reconnectInterval: number;
  maxRetries: number;
}

type MessageHandler = (msg: ConsumeMessage) => Promise<void>;

class RabbitMQManager {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly config: RabbitMQConfig;
  private isConnecting = false;
  private retryCount = 0;

  constructor(config?: Partial<RabbitMQConfig>) {
    this.config = {
      url: config?.url || process.env.RABBITMQ_URL || "amqp://localhost:5672",
      reconnectInterval: config?.reconnectInterval || 5000,
      maxRetries: config?.maxRetries || 10,
    };
  }

  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      console.log("Connecting to RabbitMQ...");
      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

      this.connection.on("error", (err: Error) => {
        console.error("RabbitMQ connection error:", err);
        this.handleDisconnect();
      });

      this.connection.on("close", () => {
        console.log("RabbitMQ connection closed");
        this.handleDisconnect();
      });

      this.retryCount = 0;
      console.log("RabbitMQ connected successfully");
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      this.handleDisconnect();
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private handleDisconnect(): void {
    this.connection = null;
    this.channel = null;

    if (this.retryCount < this.config.maxRetries) {
      this.retryCount++;
      console.log(
        `Reconnecting to RabbitMQ (attempt ${this.retryCount}/${this.config.maxRetries})...`,
      );
      setTimeout(() => this.connect(), this.config.reconnectInterval);
    } else {
      console.error("Max RabbitMQ reconnection attempts reached");
    }
  }

  async getChannel(): Promise<Channel> {
    if (!this.channel) {
      await this.connect();
    }
    if (!this.channel) {
      throw new Error("RabbitMQ channel not available");
    }
    return this.channel;
  }

  async assertQueue(
    queue: string,
    options?: amqp.Options.AssertQueue,
  ): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertQueue(queue, {
      durable: true,
      ...options,
    });
  }

  async assertExchange(
    exchange: string,
    type: "direct" | "topic" | "fanout" | "headers",
    options?: amqp.Options.AssertExchange,
  ): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertExchange(exchange, type, {
      durable: true,
      ...options,
    });
  }

  async bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
  ): Promise<void> {
    const channel = await this.getChannel();
    await channel.bindQueue(queue, exchange, routingKey);
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: Record<string, unknown>,
    options?: amqp.Options.Publish,
  ): Promise<boolean> {
    const channel = await this.getChannel();
    const buffer = Buffer.from(JSON.stringify(message));

    return channel.publish(exchange, routingKey, buffer, {
      persistent: true,
      contentType: "application/json",
      ...options,
    });
  }

  async sendToQueue(
    queue: string,
    message: Record<string, unknown>,
    options?: amqp.Options.Publish,
  ): Promise<boolean> {
    const channel = await this.getChannel();
    const buffer = Buffer.from(JSON.stringify(message));

    return channel.sendToQueue(queue, buffer, {
      persistent: true,
      contentType: "application/json",
      ...options,
    });
  }

  async consume(
    queue: string,
    handler: MessageHandler,
    options?: amqp.Options.Consume,
  ): Promise<string> {
    const channel = await this.getChannel();

    const { consumerTag } = await channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (msg) {
          try {
            await handler(msg);
            channel.ack(msg);
          } catch (error) {
            console.error("Error processing message:", error);
            channel.nack(msg, false, true);
          }
        }
      },
      options,
    );

    return consumerTag;
  }

  async cancelConsumer(consumerTag: string): Promise<void> {
    const channel = await this.getChannel();
    await channel.cancel(consumerTag);
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      console.log("RabbitMQ connection closed gracefully");
    } catch (error) {
      console.error("Error closing RabbitMQ connection:", error);
    }
  }
}

declare global {
  var rabbitmq: RabbitMQManager | undefined;
}

const rabbitmq = globalThis.rabbitmq ?? new RabbitMQManager();

if (process.env.NODE_ENV !== "production") {
  globalThis.rabbitmq = rabbitmq;
}

export default rabbitmq;
export { RabbitMQManager };
