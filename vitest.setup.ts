process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "file::memory:";
process.env.LLM_PROVIDER ??= "fake";
process.env.SETTINGS_ENC_KEY ??= Buffer.alloc(32, 1).toString("base64");
