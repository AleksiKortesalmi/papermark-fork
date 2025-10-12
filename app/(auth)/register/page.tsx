import { Metadata } from "next";

import RegisterClient from "./page-client";

const data = {
  description: "Signup to Papermark",
  title: "Sign up | Papermark",
  url: "/register",
};

export const metadata: Metadata = {
  title: data.title,
  description: data.description,
  openGraph: {
    title: data.title,
    description: data.description,
    url: data.url,
    siteName: "Papermark",
    images: [
      {
        url: "/_static/meta-image.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
