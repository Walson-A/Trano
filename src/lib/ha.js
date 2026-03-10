import {
  createConnection,
  createLongLivedTokenAuth,
} from "home-assistant-js-websocket";

export const connectHA = async (url, token) => {
  const auth = createLongLivedTokenAuth(url, token);
  const connection = await createConnection({ auth });
  return connection;
};
