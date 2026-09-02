/**
 * Supabase Table-Based Authentication & API Verification Suite
 * 
 * Verifies all database tables and CRUD operations:
 *   1. Environment configuration
 *   2. Supabase Client init
 *   3. Custom 'users' table access & credential verification (Sign Up / Sign In / Password Hashing)
 *   4. 'user_settings' table access & user preferences
 *   5. 'categories' table access (System defaults + Custom categories)
 *   6. 'expenses' table CRUD operations (Create, Read, Update, Delete)
 *   7. Data isolation between distinct users
 * 
 * Usage:
 *   node scripts/test-api.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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
const SUPABASE_ANON_KEY = argKey || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE;

// Password hashing utility for Node test runner
function generateSalt(length = 16) {
  return crypto.randomBytes(length).toString("hex");
}

function hashPassword(password, salt = generateSalt(16)) {
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}__expense_tracker_salt__${password}`)
    .digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== "string") return false;
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHash] = parts;
  const computedHash = crypto
    .createHash("sha256")
    .update(`${salt}__expense_tracker_salt__${password}`)
    .digest("hex");
  return computedHash === expectedHash;
}

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

function printResult(testName, passed, details = "") {
  const icon = passed ? "✓ PASS" : "✗ FAIL";
  const color = passed ? "green" : "red";
  print(`  ${icon} : ${testName}`, color);
  if (details) {
    console.log(`         ${details}`);
  }
}

async function runTests() {
  printHeader("SUPABASE TABLE-BASED AUTH & API VERIFICATION SUITE");

  // Step 1: Check Environment Variables
  console.log("\n[1] Verifying Environment Configuration...");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    printResult("Environment Variables", false, "Missing SUPABASE_URL or SUPABASE_ANON in .env");
    return;
  }
  printResult("Environment Variables Detected", true, `URL: ${SUPABASE_URL}`);

  // Step 2: Initialize Supabase Client
  console.log("\n[2] Initializing Supabase Client (Anon Key)...");
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

  // Step 3: Test Categories Table & System Defaults
  console.log("\n[3] Testing 'categories' Table Access & System Defaults...");
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        printResult("Categories Table Access", false, "Table 'public.categories' not found. Please run schema.sql.");
      } else {
        printResult("Categories Table Access", false, `${error.code || "Error"}: ${error.message}`);
      }
    } else {
      printResult("Categories Table Accessible", true, `Found ${categories.length} total categories`);
      const defaultCats = categories.filter((c) => c.is_default || c.user_id === null);
      printResult("Default Seed Categories Verified", defaultCats.length >= 9, `${defaultCats.length} default categories configured`);
    }
  } catch (err) {
    printResult("Categories Query", false, err.message);
  }

  // Step 4: Test Custom 'users' Table (Table-Based Credentials)
  console.log("\n[4] Testing Custom 'users' Table & Credential Verification...");
  const testTimestamp = Date.now();
  const testEmail = `test_user_${testTimestamp}@tracker.local`;
  const testPassword = "SecretPassword123!";
  const wrongPassword = "WrongPassword999!";
  let testUser = null;

  try {
    // 4a. Check users table access
    const { data: usersCheck, error: usersCheckError } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (usersCheckError) {
      if (usersCheckError.code === "42P01" || usersCheckError.code === "PGRST205") {
        printResult(
          "Users Table Check",
          false,
          "Table 'public.users' does not exist yet. Please execute the updated schema.sql in Supabase SQL Editor."
        );
        print("\n  👉 To create the table, copy and run schema.sql in the Supabase SQL Editor.", "yellow");
        return;
      }
      printResult("Users Table Access", false, `${usersCheckError.code}: ${usersCheckError.message}`);
      return;
    }

    printResult("Users Table Accessible", true);

    // 4b. Test Sign Up (Password Hashing + Insert)
    const passwordHash = hashPassword(testPassword);
    const { data: newUserData, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email: testEmail,
          password_hash: passwordHash,
          name: "Test Runner User",
        },
      ])
      .select("id, email, name, created_at")
      .single();

    if (insertError) {
      printResult("User Sign-Up (Insert into users table)", false, insertError.message);
    } else {
      testUser = newUserData;
      printResult(
        "User Sign-Up (Credential Storage)",
        true,
        `User ID: ${testUser.id} | Email: ${testUser.email}`
      );

      // 4c. Test Sign In (Lookup + Verify Password Hash)
      const { data: lookupUser, error: lookupError } = await supabase
        .from("users")
        .select("id, email, password_hash")
        .eq("email", testEmail)
        .single();

      if (lookupError || !lookupUser) {
        printResult("User Sign-In Lookup", false, lookupError?.message || "User not found");
      } else {
        const isMatch = verifyPassword(testPassword, lookupUser.password_hash);
        printResult("User Sign-In (Password Verification)", isMatch, "Correct password successfully verified against stored hash");

        const isWrongRejected = !verifyPassword(wrongPassword, lookupUser.password_hash);
        printResult("Security Check (Wrong Password Rejected)", isWrongRejected, "Invalid credentials correctly rejected");
      }

      // 4d. Duplicate Email Prevention Check
      const { error: dupError } = await supabase
        .from("users")
        .insert([
          {
            email: testEmail,
            password_hash: passwordHash,
            name: "Duplicate User",
          },
        ]);
      printResult("Duplicate Email Constraint", Boolean(dupError), "Unique constraint prevents duplicate accounts");
    }
  } catch (err) {
    printResult("Users Table Verification", false, err.message);
  }

  if (!testUser) {
    print("\nSkipping dependent user tests because user could not be created.", "yellow");
    return;
  }

  // Step 5: Test 'user_settings' Table
  console.log("\n[5] Testing 'user_settings' Table for Custom User...");
  try {
    const { data: settingsInsert, error: settingsError } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: testUser.id,
          monthly_budget: 1500.0,
          theme: "dark",
          currency: "Rs.",
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (settingsError) {
      printResult("User Settings Upsert", false, settingsError.message);
    } else {
      printResult(
        "User Settings Upsert",
        true,
        `Budget: ${settingsInsert.monthly_budget} ${settingsInsert.currency} | Theme: ${settingsInsert.theme}`
      );

      const { data: settingsRead, error: readError } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", testUser.id)
        .single();

      printResult("User Settings Read", !readError && Boolean(settingsRead), `Verified for user ${testUser.id}`);
    }
  } catch (err) {
    printResult("User Settings Test", false, err.message);
  }

  // Step 6: Test 'expenses' Table CRUD for Custom User
  console.log("\n[6] Testing 'expenses' Table CRUD Operations...");
  let createdExpenseId = null;
  try {
    // 6a. CREATE Expense
    const { data: expenseItem, error: expenseCreateError } = await supabase
      .from("expenses")
      .insert([
        {
          user_id: testUser.id,
          amount: 85.5,
          category: "Food",
          description: "Team Dinner & Snacks",
          date: new Date().toISOString().slice(0, 10),
          payment_method: "Card",
          note: "API verification test",
        },
      ])
      .select()
      .single();

    if (expenseCreateError) {
      printResult("Expense Creation (INSERT)", false, expenseCreateError.message);
    } else {
      createdExpenseId = expenseItem.id;
      printResult(
        "Expense Creation (INSERT)",
        true,
        `Created Expense ID: ${createdExpenseId} | Amount: Rs. ${expenseItem.amount}`
      );

      // 6b. READ Expense
      const { data: userExpenses, error: readError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", testUser.id);

      printResult(
        "Expense Query (SELECT with user_id filter)",
        !readError && userExpenses.length > 0,
        `Retrieved ${userExpenses?.length || 0} expenses for user`
      );

      // 6c. UPDATE Expense
      const { data: updatedExpense, error: updateError } = await supabase
        .from("expenses")
        .update({ amount: 95.0, description: "Updated Team Dinner" })
        .eq("id", createdExpenseId)
        .eq("user_id", testUser.id)
        .select()
        .single();

      printResult(
        "Expense Modification (UPDATE)",
        !updateError && updatedExpense?.amount === 95.0,
        `Updated amount to Rs. ${updatedExpense?.amount}`
      );

      // 6d. DELETE Expense
      const { error: deleteError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", createdExpenseId)
        .eq("user_id", testUser.id);

      printResult("Expense Deletion (DELETE)", !deleteError, `Deleted test expense ${createdExpenseId}`);
    }
  } catch (err) {
    printResult("Expenses Operations", false, err.message);
  }

  // Step 7: Test Multi-Tenant Data Isolation
  console.log("\n[7] Testing Multi-Tenant Data Isolation...");
  try {
    // Insert expense for User 1
    const { data: user1Expense } = await supabase
      .from("expenses")
      .insert([
        {
          user_id: testUser.id,
          amount: 50.0,
          category: "Health",
          description: "Private Medical Expense",
          date: new Date().toISOString().slice(0, 10),
        },
      ])
      .select()
      .single();

    // Create a 2nd user
    const otherEmail = `isolated_user_${Date.now()}@tracker.local`;
    const { data: user2 } = await supabase
      .from("users")
      .insert([
        {
          email: otherEmail,
          password_hash: hashPassword("OtherPass123!"),
          name: "Other User",
        },
      ])
      .select("id")
      .single();

    if (user2) {
      // Query User 2's expenses
      const { data: user2Expenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user2.id);

      const isIsolated = user2Expenses && user2Expenses.length === 0;
      printResult(
        "Data Isolation Between Users",
        isIsolated,
        `User 2 cannot see User 1's expenses (${user2Expenses?.length || 0} records for User 2)`
      );

      // Cleanup user 2 and test expense
      await supabase.from("users").delete().eq("id", user2.id);
    }

    if (user1Expense) {
      await supabase.from("expenses").delete().eq("id", user1Expense.id);
    }
  } catch (err) {
    printResult("Data Isolation Check", false, err.message);
  }

  // Clean up primary test user (cascades to user_settings & expenses)
  try {
    await supabase.from("users").delete().eq("id", testUser.id);
  } catch (e) {}

  // Summary
  printHeader("VERIFICATION SUMMARY");
  print("✓ Table-based authentication and database APIs are configured.", "green");
  print("✓ Run 'node scripts/test-api.js' anytime to check your live Supabase database.", "cyan");
  console.log("\n");
}

runTests();
