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

// // Create a new ratelimiter, that allows 10 requests per 10 seconds by default
// export const ratelimit = (
//   requests: number = 10,
//   seconds: number = 10,
// ) => {
//   return new RateLimiterRedis({
//     storeClient: redis,
//     points: requests,
//     duration: seconds,
//     keyPrefix: "papermark",
//     execEvenly: true,  // enables sliding window behavior
//   });
// };

export function ratelimit(requests: number, seconds: number = 10) {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    points: requests,
    duration: seconds,
    keyPrefix: "papermark",
    execEvenly: true,  // enables sliding window behavior
  });

  return {
    async limit(key: string) {
      try {
        // consume 1 point
        const res = await limiter.consume(key);

        return {
          success: true,
          limit: requests,
          remaining: res.remainingPoints,
          reset: Math.ceil(res.msBeforeNext / 1000), // convert ms → seconds
        };
      } catch (err: any) {
        // When points are exhausted, err contains remaining info
        return {
          success: false,
          limit: requests,
          remaining: 0,
          reset: Math.ceil(err.msBeforeNext / 1000),
        };
      }
    },
  };
}