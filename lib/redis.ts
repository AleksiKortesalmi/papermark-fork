import { RateLimiterRedis } from "rate-limiter-flexible";
import IORedis from "ioredis";

let redisClient: IORedis | null = null;
let lockerClient: IORedis | null = null;

// Immediately create and connect the main redis client (singleton)
export const redis: IORedis = (() => {
  if (!redisClient) {
    redisClient = new IORedis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,    // optional, recommended
    });

    redisClient.on("error", (err) => console.error("Redis Client Error", err));
    redisClient.on("connect", () => console.log("Redis connected"));
  }
  return redisClient;
})();

// Immediately create and connect the locker redis client (singleton)
export const lockerRedisClient: IORedis = (() => {
  if (!lockerClient) {
    lockerClient = new IORedis(process.env.REDIS_URL as string);

    lockerClient.on("error", (err) => console.error("Locker Redis Client Error", err));
    lockerClient.on("connect", () => console.log("Locker Redis connected"));
  }
  return lockerClient;
})();

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds: number = 10,
) => {
  return new RateLimiterRedis({
    storeClient: redis,
    points: requests,
    duration: seconds,
    keyPrefix: "papermark",
    execEvenly: true,  // enables sliding window behavior
  });
};
