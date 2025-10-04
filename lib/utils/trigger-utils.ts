import { BasePlan } from "../swr/use-billing";

type TQueueConfig = {
  name: string;
  concurrencyLimit: number;
};

const concurrencyConfig: Record<string, number> = {
  free: 10,
  starter: 10,
  pro: 10,
  business: 10,
  datarooms: 10,
  "datarooms-plus": 10,
};

export const conversionQueue = (plan: string): TQueueConfig => {
  const planName = plan.split("+")[0] as BasePlan;

  return {
    name: `conversion-${planName}`,
    concurrencyLimit: concurrencyConfig[planName],
  };
};
