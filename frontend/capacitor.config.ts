import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cantineplus.app",
  appName: "Cantine+",
  webDir: "out",
  server: {
    url: "https://cantine-plus-web.vercel.app",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
