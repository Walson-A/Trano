import {
  createConnection,
  createLongLivedTokenAuth,
  Connection,
} from "home-assistant-js-websocket";

export const connectHA = async (url: string, token: string): Promise<Connection> => {
  const auth = createLongLivedTokenAuth(url, token);
  const connection = await createConnection({ auth });
  return connection;
};
