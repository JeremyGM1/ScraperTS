import "dotenv/config";

interface ScraperCredentials {
  email: string;
  password: string;
}

interface Config {
  retrotrac: ScraperCredentials;
  parteequipos: ScraperCredentials;
  servi: ScraperCredentials;
  agrocosta: ScraperCredentials;
  catekom: ScraperCredentials;
}

const requiredVars = {
  RETROTRAC_EMAIL: "RETROTRAC_EMAIL",
  RETROTRAC_PASSWORD: "RETROTRAC_PASSWORD",
  PARTEEQUIPOS_EMAIL: "PARTEEQUIPOS_EMAIL",
  PARTEEQUIPOS_PASSWORD: "PARTEEQUIPOS_PASSWORD",
  SERVI_EMAIL: "SERVI_EMAIL",
  SERVI_PASSWORD: "SERVI_PASSWORD",
  AGRO_EMAIL: "AGRO_EMAIL",
  AGRO_PASSWORD: "AGRO_PASSWORD",
  CATEKOM_EMAIL: "CATEKOM_EMAIL",
  CATEKOM_PASSWORD: "CATEKOM_PASSWORD"
} as const;

function validateEnv(): void {
  const missing = Object.keys(requiredVars).filter((key) => !process.env[key]);
  
  if(missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join("\n - ")}\n` + "Make sure they are set in your .env file.");
    process.exit(1);
  };
}

validateEnv();

const config: Config = {
  retrotrac: {
    email: process.env.RETROTRAC_EMAIL!,
    password: process.env.RETROTRAC_PASSWORD!,
  },
  parteequipos: {
    email: process.env.PARTEEQUIPOS_EMAIL!,
    password: process.env.PARTEEQUIPOS_PASSWORD!,
  },
  servi: {
    email: process.env.SERVI_EMAIL!,
    password: process.env.SERVI_PASSWORD!,
  },
  agrocosta: {
    email: process.env.AGRO_EMAIL!,
    password: process.env.AGRO_PASSWORD!,
  },
  catekom: {
    email: process.env.CATEKOM_EMAIL!,
    password: process.env.CATEKOM_PASSWORD!,
  },
};

export { config };