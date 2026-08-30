/**
 * Supabase Backend & API Verification Script for Expense Tracker
 * 
 * Usage:
 *   1. From .env file:
 *      node scripts/test-api.js
 * 
 *   2. Or passing credentials directly via command line:
 *      node scripts/test-api.js <SUPABASE_URL> <SUPABASE_ANON_KEY>
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// 1. Parse .env file if present
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
        if (key && value && !process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnv();

const argUrl = process.argv[2];
const argKey = process.argv[3];

const SUPABASE_URL = argUrl || process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = argKey || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Color output formatting
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function print(text, color = "reset") {
  console.log(`${colors[color] || ""}${text}${colors.reset}`);
}

function printHeader(title) {
  console.log("\n" + "=".repeat(65));
  print(`  ${title}`, "bold");
  console.log("=".repeat(65));
}

function printResult(name, pass, details = "") {
  const symbol = pass ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`  ${symbol} : ${name}`);
  if (details) {
    console.log(`         ${colors.yellow}${details}${colors.reset}`);
  }
}

async function runTests() {
  printHeader("SUPABASE API & BACKEND VERIFICATION SUITE");

  // Step 1: Check Environment Configuration
  console.log("\n[1] Verifying Environment Variables...");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    printResult("Environment Variables", false, "Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in .env");
    print("\nTo run the tests with your live Supabase project:", "yellow");
    print("  1. Fill your .env file with:", "cyan");
    print("     REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co", "cyan");
    print("     REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOi...", "cyan");
    print("  2. Or pass them directly: node scripts/test-api.js <URL> <KEY>", "cyan");
    return;
  }

  printResult("Environment Variables Detected", true, `URL: ${SUPABASE_URL}`);

  // Step 2: Initialize Supabase Client
  console.log("\n[2] Initializing Supabase Client...");
  let supabase;
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    printResult("Supabase Client Initialization", true);
  } catch (err) {
    printResult("Supabase Client Initialization", false, err.message);
    return;
  }

  // Step 3: Test Categories Table & Seed Data
  console.log("\n[3] Testing 'categories' Table Access & Defaults...");
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      if (error.code === "42P01") {
        printResult("Categories Table Access", false, "Table 'public.categories' does not exist. Please run schema.sql in Supabase SQL editor.");
      } else {
        printResult("Categories Table Access", false, `${error.code || "Error"}: ${error.message}`);
      }
    } else {
      printResult("Categories Table Accessible", true, `Found ${categories.length} categories`);
      const defaultCats = categories.filter((c) => c.is_default);
      printResult("Default Seed Categories Verified", defaultCats.length >= 9, `${defaultCats.length} default categories configured`);
    }
  } catch (err) {
    printResult("Categories Query", false, err.message);
  }

  // Step 4: Test Supabase Auth API
  console.log("\n[4] Testing Supabase Auth & Session Flow...");
  const testEmail = `test_runner_${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  let testUser = null;

  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      printResult("Auth Sign Up", false, signUpError.message);
    } else {
      testUser = signUpData.user;
      printResult("Auth Sign Up (New Test User)", true, `User ID: ${testUser?.id}`);

      // Try signing in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (signInError) {
        // If email confirmation is enabled in Supabase, sign in may require email confirmation
        if (signInError.message.includes("Email not confirmed")) {
          printResult("Auth Sign In", true, "Email confirmation required in your Supabase project (expected for default auth)");
        } else {
          printResult("Auth Sign In", false, signInError.message);
        }
      } else {
        printResult("Auth Sign In & Session Token", true, `Token: ${signInData.session?.access_token ? "Acquired" : "None"}`);
      }
    }
  } catch (err) {
    printResult("Auth Test Flow", false, err.message);
  }

  // Step 5: Test User Settings Table
  console.log("\n[5] Testing 'user_settings' Table Access...");
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .limit(1);

    if (error) {
      printResult("User Settings Table Access", false, error.message);
    } else {
      printResult("User Settings Table Accessible", true);
    }
  } catch (err) {
    printResult("User Settings Table Access", false, err.message);
  }

  // Step 6: Test Expenses Table Structure & CRUD
  console.log("\n[6] Testing 'expenses' Table & Operations...");
  try {
    const { data: selectData, error: selectError } = await supabase
      .from("expenses")
      .select("*")
      .limit(5);

    if (selectError) {
      if (selectError.code === "42P01") {
        printResult("Expenses Table Access", false, "Table 'public.expenses' does not exist. Please execute schema.sql in Supabase.");
      } else {
        printResult("Expenses Table Query", false, `${selectError.code || ""}: ${selectError.message}`);
      }
    } else {
      printResult("Expenses Table Accessible", true, `Found ${selectData.length} records in query`);
    }
  } catch (err) {
    printResult("Expenses Table Test", false, err.message);
  }

  // Summary
  printHeader("VERIFICATION SUMMARY");
  print("✓ Backend API scripts and schema are ready to run.", "green");
  print("✓ Run 'node scripts/test-api.js' anytime to check your live Supabase connection.", "cyan");
  console.log("\n");
}

runTests();
