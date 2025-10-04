import { sendEmail } from "@/lib/resend";

import UpgradePersonalEmail from "@/components/emails/upgrade-personal-welcome";

import { CreateUserEmailProps } from "../types";

const PLAN_TYPE_MAP = {
  pro: "Pro",
  business: "Business",
  datarooms: "Data Rooms",
  "datarooms-plus": "Data Rooms Plus",
};