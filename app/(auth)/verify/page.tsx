import { Metadata } from "next";
import Link from "next/link";

import NotFound from "@/pages/404";

import { generateChecksum } from "@/lib/utils/generate-checksum";

import { LogoCloud } from "@/components/shared/logo-cloud";
import { Button } from "@/components/ui/button";

const data = {
  description: "Verify login to Papermark",
  title: "Verify | Papermark",
  url: "/verify",
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

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { verification_url?: string; checksum?: string };
}) {
  const { verification_url, checksum } = searchParams;

  if (!verification_url || !checksum) {
    return <NotFound />;
  }

  // Server-side validation
  const isValidVerificationUrl = (url: string, checksum: string): boolean => {
    try {
      const urlObj = new URL(url);
      if (urlObj.origin !== process.env.NEXTAUTH_URL) return false;
      const expectedChecksum = generateChecksum(url);
      return checksum === expectedChecksum;
    } catch {
      return false;
    }
  };

  if (!isValidVerificationUrl(verification_url, checksum)) {
    return <NotFound />;
  }

  return (
    <div className="flex h-screen w-full flex-wrap">
      {/* Left part */}
      <div className="flex w-full justify-center bg-gray-50">
        <div
          className="absolute inset-x-0 top-10 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
          aria-hidden="true"
        ></div>
        <div className="z-10 mx-5 mt-[calc(1vh)] h-fit w-full max-w-md overflow-hidden rounded-lg sm:mx-0 sm:mt-[calc(2vh)] md:mt-[calc(3vh)]">
          <div className="items-left flex flex-col space-y-3 px-4 py-6 pt-8 sm:px-12">
            <img
              src="/_static/papermark-logo.svg"
              alt="Papermark Logo"
              className="-mt-8 mb-36 h-7 w-auto self-start sm:mb-32 md:mb-48"
            />
            <Link href="/">
              <span className="text-balance text-3xl font-semibold text-gray-900">
                Verify your login
              </span>
            </Link>
            <h3 className="text-balance text-sm text-gray-800">
              Share documents. Not attachments.
            </h3>
          </div>
          <div className="flex flex-col gap-4 px-4 pt-8 sm:px-12">
            <div className="relative">
              <Link href={verification_url}>
                <Button className="focus:shadow-outline w-full transform rounded bg-gray-800 px-4 py-2 text-white transition-colors duration-300 ease-in-out hover:bg-gray-900 focus:outline-none">
                  Verify email
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
