import { GetServerSidePropsContext } from "next";
import Head from "next/head";
import { useEffect } from "react";
import {
  exchangeAuthorizationCode,
  storageKey,
} from "wagmi-bitkubnext-connector";
import { env } from "../../env/client.mjs";

type CallBackProps = {
  code: string;
};

const CallBackPage = ({ code }: CallBackProps) => {
  useEffect(() => {
    getAccessToken();
  }, []);

  const getAccessToken = async () => {
    if (window && window.localStorage) {
      if (code) {
        try {
          const result = await exchangeAuthorizationCode(
            env.NEXT_PUBLIC_BKN_CLIENT_ID,
            env.NEXT_PUBLIC_REDIRECT_URI,
            code
          );
          localStorage.setItem(storageKey.ACCESS_TOKEN, result.access_token);
          localStorage.setItem(storageKey.REFRESH_TOKEN, result.refresh_token);
          localStorage.setItem(storageKey.RESULT, JSON.stringify(result));
        } catch (error: any) {
          if (error.response && error.response.data) {
            localStorage.setItem(storageKey.RESULT_ERROR, error.response.data);
          } else {
            localStorage.setItem(
              storageKey.RESULT_ERROR,
              "error get access token"
            );
          }
        }
        const countdownCloseWindow = setTimeout(() => {
          window.close();
          clearTimeout(countdownCloseWindow);
        }, 500);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Bitkub Next OAuth Callback</title>
      </Head>
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <div className="text-sm">Connecting to Bitkub Next</div>
      </div>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const query = context.query;

  return {
    props: {
      code: query.code,
    },
  };
};

export default CallBackPage;
