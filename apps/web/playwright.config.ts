import { defineConfig,devices } from "@playwright/test";
export default defineConfig({testDir:"./e2e",timeout:45_000,retries:process.env.CI?1:0,workers:1,reporter:"line",use:{baseURL:"http://127.0.0.1:4173",trace:"off",channel:"chromium"},projects:[{name:"desktop",use:{...devices["Desktop Chrome"]}},{name:"mobile",use:{...devices["Pixel 5"]}}]});
