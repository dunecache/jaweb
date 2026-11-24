process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "file::memory:";
process.env.LLM_PROVIDER ??= "fake";
