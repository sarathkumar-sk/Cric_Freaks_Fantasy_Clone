import express from "express";
import path from "path";
import * as cheerio from "cheerio";
import axios from "axios";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Load Firebase config safely
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else {
    console.warn("firebase-applet-config.json not found at", configPath);
  }
} catch (e) {
  console.error("Failed to load firebase-applet-config.json:", e);
}

// Initialize Firebase Admin
console.log("Initializing Firebase Admin...");
let adminApp: any = null;

function getAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0];
  
  const options: any = {};
  if (firebaseConfig.projectId) {
    options.projectId = firebaseConfig.projectId;
  }
  
  try {
    // In AIS Build, initializing with just projectId often works best as it picks up environment credentials
    console.log("Initializing Firebase Admin with options:", JSON.stringify(options));
    return admin.initializeApp(options);
  } catch (e) {
    console.warn("Firebase Admin initialization with options failed, trying with applicationDefault...");
    try {
      options.credential = admin.credential.applicationDefault();
      return admin.initializeApp(options);
    } catch (e2) {
      console.error("Firebase Admin initialization failed completely:", e2);
      return null;
    }
  }
}

adminApp = getAdminApp();
// Use the named database if provided, otherwise default
let dbAdmin: any = null;
let isUsingFallbackDb = false;

try {
  if (adminApp) {
    dbAdmin = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || undefined);
    console.log("Connected to Firestore. Project:", firebaseConfig.projectId, "Database:", firebaseConfig.firestoreDatabaseId || "(default)");
  }
} catch (e) {
  console.warn("Failed to connect to configured Firestore database, falling back to default...", e);
  try {
    if (adminApp) {
      dbAdmin = getFirestore(adminApp);
      isUsingFallbackDb = true;
      console.log("Connected to default Firestore database.");
    }
  } catch (e2) {
    console.error("Firestore connection failed completely:", e2);
  }
}

if (!dbAdmin) {
  console.error("Firestore Database connection failed - dbAdmin is null");
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    timestamp: new Date().toISOString()
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const app = express();
const PORT = 3000;
const CRICBUZZ_URL = "https://www.cricbuzz.com";

// Mock Player Data for different teams
const TEAM_PLAYERS: Record<string, any[]> = {

  // ─────────────────────────────────────────
  // CHENNAI SUPER KINGS (CSK)
  // Captain: Ruturaj Gaikwad
  // ─────────────────────────────────────────
  "CSK": [
    // Batters / WK
    { id: "csk1",  name: "Ruturaj Gaikwad",    role: "BAT",  team: "CSK", credits: 10.0, status: "playing", points: 0 },
    { id: "csk2",  name: "MS Dhoni",            role: "WK",   team: "CSK", credits: 9.5,  status: "playing", points: 0 },
    { id: "csk3",  name: "Sanju Samson",        role: "WK",   team: "CSK", credits: 10.0, status: "playing", points: 0 },
    { id: "csk4",  name: "Dewald Brevis",       role: "BAT",  team: "CSK", credits: 9.0,  status: "playing", points: 0 },
    { id: "csk5",  name: "Ayush Mhatre",        role: "BAT",  team: "CSK", credits: 8.5,  status: "playing", points: 0 },
    { id: "csk6",  name: "Kartik Sharma",       role: "WK",   team: "CSK", credits: 8.5,  status: "playing", points: 0 },
    { id: "csk7",  name: "Sarfaraz Khan",       role: "BAT",  team: "CSK", credits: 9.0,  status: "playing", points: 0 },
    { id: "csk8",  name: "Urvil Patel",         role: "WK",   team: "CSK", credits: 8.0,  status: "playing", points: 0 },
    // All-Rounders
    { id: "csk9",  name: "Shivam Dube",         role: "AR",   team: "CSK", credits: 9.5,  status: "playing", points: 0 },
    { id: "csk10", name: "Jamie Overton",       role: "AR",   team: "CSK", credits: 8.5,  status: "playing", points: 0 },
    { id: "csk11", name: "Matthew Short",       role: "AR",   team: "CSK", credits: 8.5,  status: "playing", points: 0 },
    { id: "csk12", name: "Anshul Kamboj",       role: "AR",   team: "CSK", credits: 8.0,  status: "playing", points: 0 },
    { id: "csk13", name: "Prashant Veer",       role: "AR",   team: "CSK", credits: 8.0,  status: "playing", points: 0 },
    { id: "csk14", name: "Ramakrishna Ghosh",   role: "AR",   team: "CSK", credits: 7.5,  status: "playing", points: 0 },
    { id: "csk15", name: "Aman Khan",           role: "AR",   team: "CSK", credits: 7.5,  status: "playing", points: 0 },
    { id: "csk16", name: "Zak Foulkes",         role: "AR",   team: "CSK", credits: 7.5,  status: "playing", points: 0 },
    // Bowlers
    { id: "csk17", name: "Khaleel Ahmed",       role: "BOWL", team: "CSK", credits: 8.5,  status: "playing", points: 0 },
    { id: "csk18", name: "Noor Ahmad",          role: "BOWL", team: "CSK", credits: 9.0,  status: "playing", points: 0 },
    { id: "csk19", name: "Mukesh Choudhary",    role: "BOWL", team: "CSK", credits: 8.0,  status: "playing", points: 0 },
    { id: "csk20", name: "Nathan Ellis",        role: "BOWL", team: "CSK", credits: 8.0,  status: "playing", points: 0 },
    { id: "csk21", name: "Shreyas Gopal",       role: "BOWL", team: "CSK", credits: 8.0,  status: "playing", points: 0 },
    { id: "csk22", name: "Gurjapneet Singh",    role: "BOWL", team: "CSK", credits: 7.5,  status: "playing", points: 0 },
    { id: "csk23", name: "Akeal Hosein",        role: "BOWL", team: "CSK", credits: 8.0,  status: "playing", points: 0 },
    { id: "csk24", name: "Matt Henry",          role: "BOWL", team: "CSK", credits: 8.5,  status: "playing", points: 0 },
    { id: "csk25", name: "Rahul Chahar",        role: "BOWL", team: "CSK", credits: 8.5,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // MUMBAI INDIANS (MI)
  // Captain: Hardik Pandya
  // ─────────────────────────────────────────
  "MI": [
    // Batters / WK
    { id: "mi1",  name: "Rohit Sharma",         role: "BAT",  team: "MI", credits: 10.5, status: "playing", points: 0 },
    { id: "mi2",  name: "Suryakumar Yadav",     role: "BAT",  team: "MI", credits: 10.5, status: "playing", points: 0 },
    { id: "mi3",  name: "Robin Minz",           role: "WK",   team: "MI", credits: 8.0,  status: "playing", points: 0 },
    { id: "mi4",  name: "Ryan Rickelton",       role: "WK",   team: "MI", credits: 8.5,  status: "playing", points: 0 },
    { id: "mi5",  name: "Quinton de Kock",      role: "WK",   team: "MI", credits: 9.5,  status: "playing", points: 0 },
    { id: "mi6",  name: "Tilak Varma",          role: "BAT",  team: "MI", credits: 9.5,  status: "playing", points: 0 },
    { id: "mi7",  name: "Sherfane Rutherford",  role: "BAT",  team: "MI", credits: 8.5,  status: "playing", points: 0 },
    { id: "mi8",  name: "Danish Malewar",       role: "BAT",  team: "MI", credits: 7.5,  status: "playing", points: 0 },
    // All-Rounders
    { id: "mi9",  name: "Hardik Pandya",        role: "AR",   team: "MI", credits: 11.0, status: "playing", points: 0 },
    { id: "mi10", name: "Will Jacks",           role: "AR",   team: "MI", credits: 9.0,  status: "playing", points: 0 },
    { id: "mi11", name: "Mitchell Santner",     role: "AR",   team: "MI", credits: 9.0,  status: "playing", points: 0 },
    { id: "mi12", name: "Shardul Thakur",       role: "AR",   team: "MI", credits: 8.5,  status: "playing", points: 0 },
    { id: "mi13", name: "Corbin Bosch",         role: "AR",   team: "MI", credits: 8.0,  status: "playing", points: 0 },
    { id: "mi14", name: "Naman Dhir",           role: "AR",   team: "MI", credits: 8.0,  status: "playing", points: 0 },
    { id: "mi15", name: "Raj Angad Bawa",       role: "AR",   team: "MI", credits: 7.5,  status: "playing", points: 0 },
    { id: "mi16", name: "Atharva Ankolekar",    role: "AR",   team: "MI", credits: 7.5,  status: "playing", points: 0 },
    { id: "mi17", name: "Mayank Rawat",         role: "AR",   team: "MI", credits: 7.5,  status: "playing", points: 0 },
    // Bowlers
    { id: "mi18", name: "Jasprit Bumrah",       role: "BOWL", team: "MI", credits: 11.0, status: "playing", points: 0 },
    { id: "mi19", name: "Trent Boult",          role: "BOWL", team: "MI", credits: 9.5,  status: "playing", points: 0 },
    { id: "mi20", name: "Deepak Chahar",        role: "BOWL", team: "MI", credits: 8.5,  status: "playing", points: 0 },
    { id: "mi21", name: "Mayank Markande",      role: "BOWL", team: "MI", credits: 8.0,  status: "playing", points: 0 },
    { id: "mi22", name: "Ashwani Kumar",        role: "BOWL", team: "MI", credits: 7.5,  status: "playing", points: 0 },
    { id: "mi23", name: "Mohammad Izhar",       role: "BOWL", team: "MI", credits: 7.5,  status: "playing", points: 0 },
    { id: "mi24", name: "Raghu Sharma",         role: "BOWL", team: "MI", credits: 7.0,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // ROYAL CHALLENGERS BENGALURU (RCB)
  // Captain: Rajat Patidar  |  Defending Champions
  // ─────────────────────────────────────────
  "RCB": [
    // Batters / WK
    { id: "rcb1",  name: "Virat Kohli",         role: "BAT",  team: "RCB", credits: 11.5, status: "playing", points: 0 },
    { id: "rcb2",  name: "Rajat Patidar",       role: "BAT",  team: "RCB", credits: 9.5,  status: "playing", points: 0 },
    { id: "rcb3",  name: "Phil Salt",           role: "WK",   team: "RCB", credits: 9.5,  status: "playing", points: 0 },
    { id: "rcb4",  name: "Devdutt Padikkal",    role: "BAT",  team: "RCB", credits: 9.0,  status: "playing", points: 0 },
    { id: "rcb5",  name: "Jitesh Sharma",       role: "WK",   team: "RCB", credits: 8.5,  status: "playing", points: 0 },
    { id: "rcb6",  name: "Jordan Cox",          role: "WK",   team: "RCB", credits: 8.0,  status: "playing", points: 0 },
    // All-Rounders
    { id: "rcb7",  name: "Krunal Pandya",       role: "AR",   team: "RCB", credits: 9.0,  status: "playing", points: 0 },
    { id: "rcb8",  name: "Tim David",           role: "AR",   team: "RCB", credits: 9.0,  status: "playing", points: 0 },
    { id: "rcb9",  name: "Jacob Bethell",       role: "AR",   team: "RCB", credits: 8.5,  status: "playing", points: 0 },
    { id: "rcb10", name: "Romario Shepherd",    role: "AR",   team: "RCB", credits: 8.5,  status: "playing", points: 0 },
    { id: "rcb11", name: "Venkatesh Iyer",      role: "AR",   team: "RCB", credits: 9.0,  status: "playing", points: 0 },
    { id: "rcb12", name: "Vicky Ostwal",        role: "AR",   team: "RCB", credits: 8.0,  status: "playing", points: 0 },
    { id: "rcb13", name: "Mangesh Yadav",       role: "AR",   team: "RCB", credits: 7.5,  status: "playing", points: 0 },
    { id: "rcb14", name: "Satvik Deswal",       role: "AR",   team: "RCB", credits: 7.5,  status: "playing", points: 0 },
    { id: "rcb15", name: "Vihaan Malhotra",     role: "AR",   team: "RCB", credits: 7.0,  status: "playing", points: 0 },
    { id: "rcb16", name: "Kanishk Chouhan",     role: "AR",   team: "RCB", credits: 7.0,  status: "playing", points: 0 },
    // Bowlers
    { id: "rcb17", name: "Josh Hazlewood",      role: "BOWL", team: "RCB", credits: 9.5,  status: "playing", points: 0 },
    { id: "rcb18", name: "Bhuvneshwar Kumar",   role: "BOWL", team: "RCB", credits: 9.0,  status: "playing", points: 0 },
    { id: "rcb19", name: "Yash Dayal",          role: "BOWL", team: "RCB", credits: 8.5,  status: "playing", points: 0 },
    { id: "rcb20", name: "Nuwan Thushara",      role: "BOWL", team: "RCB", credits: 8.5,  status: "playing", points: 0 },
    { id: "rcb21", name: "Suyash Sharma",       role: "BOWL", team: "RCB", credits: 8.0,  status: "playing", points: 0 },
    { id: "rcb22", name: "Rasikh Dar",          role: "BOWL", team: "RCB", credits: 8.0,  status: "playing", points: 0 },
    { id: "rcb23", name: "Jacob Duffy",         role: "BOWL", team: "RCB", credits: 7.5,  status: "playing", points: 0 },
    { id: "rcb24", name: "Abhinandan Singh",    role: "BOWL", team: "RCB", credits: 7.0,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // KOLKATA KNIGHT RIDERS (KKR)
  // Captain: Ajinkya Rahane
  // ─────────────────────────────────────────
  "KKR": [
    // Batters / WK
    { id: "kkr1",  name: "Ajinkya Rahane",      role: "BAT",  team: "KKR", credits: 8.5,  status: "playing", points: 0 },
    { id: "kkr2",  name: "Angkrish Raghuvanshi",role: "BAT",  team: "KKR", credits: 8.5,  status: "playing", points: 0 },
    { id: "kkr3",  name: "Rinku Singh",         role: "BAT",  team: "KKR", credits: 9.5,  status: "playing", points: 0 },
    { id: "kkr4",  name: "Rovman Powell",       role: "BAT",  team: "KKR", credits: 8.5,  status: "playing", points: 0 },
    { id: "kkr5",  name: "Finn Allen",          role: "WK",   team: "KKR", credits: 8.5,  status: "playing", points: 0 },
    { id: "kkr6",  name: "Tim Seifert",         role: "WK",   team: "KKR", credits: 7.5,  status: "playing", points: 0 },
    { id: "kkr7",  name: "Manish Pandey",       role: "BAT",  team: "KKR", credits: 8.0,  status: "playing", points: 0 },
    { id: "kkr8",  name: "Rahul Tripathi",      role: "BAT",  team: "KKR", credits: 8.0,  status: "playing", points: 0 },
    { id: "kkr9",  name: "Tejasvi Singh",       role: "WK",   team: "KKR", credits: 7.5,  status: "playing", points: 0 },
    // All-Rounders
    { id: "kkr10", name: "Cameron Green",       role: "AR",   team: "KKR", credits: 10.5, status: "playing", points: 0 },
    { id: "kkr11", name: "Rachin Ravindra",     role: "AR",   team: "KKR", credits: 9.0,  status: "playing", points: 0 },
    { id: "kkr12", name: "Ramandeep Singh",     role: "AR",   team: "KKR", credits: 8.0,  status: "playing", points: 0 },
    { id: "kkr13", name: "Anukul Roy",          role: "AR",   team: "KKR", credits: 7.5,  status: "playing", points: 0 },
    { id: "kkr14", name: "Sarthak Ranjan",      role: "AR",   team: "KKR", credits: 7.5,  status: "playing", points: 0 },
    { id: "kkr15", name: "Daksh Kamra",         role: "AR",   team: "KKR", credits: 7.5,  status: "playing", points: 0 },
    // Bowlers
    { id: "kkr16", name: "Sunil Narine",        role: "BOWL", team: "KKR", credits: 10.0, status: "playing", points: 0 },
    { id: "kkr17", name: "Varun Chakravarthy",  role: "BOWL", team: "KKR", credits: 9.5,  status: "playing", points: 0 },
    { id: "kkr18", name: "Matheesha Pathirana", role: "BOWL", team: "KKR", credits: 9.5,  status: "playing", points: 0 },
    { id: "kkr19", name: "Harshit Rana",        role: "BOWL", team: "KKR", credits: 9.0,  status: "playing", points: 0 },
    { id: "kkr20", name: "Vaibhav Arora",       role: "BOWL", team: "KKR", credits: 8.5,  status: "playing", points: 0 },
    { id: "kkr21", name: "Umran Malik",         role: "BOWL", team: "KKR", credits: 8.0,  status: "playing", points: 0 },
    { id: "kkr22", name: "Akash Deep",          role: "BOWL", team: "KKR", credits: 8.5,  status: "playing", points: 0 },
    { id: "kkr23", name: "Kartik Tyagi",        role: "BOWL", team: "KKR", credits: 7.5,  status: "playing", points: 0 },
    { id: "kkr24", name: "Prashant Solanki",    role: "BOWL", team: "KKR", credits: 7.5,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // SUNRISERS HYDERABAD (SRH)
  // Captain: Pat Cummins
  // ─────────────────────────────────────────
  "SRH": [
    // Batters / WK
    { id: "srh1",  name: "Travis Head",         role: "BAT",  team: "SRH", credits: 11.0, status: "playing", points: 0 },
    { id: "srh2",  name: "Heinrich Klaasen",    role: "WK",   team: "SRH", credits: 10.5, status: "playing", points: 0 },
    { id: "srh3",  name: "Ishan Kishan",        role: "WK",   team: "SRH", credits: 9.5,  status: "playing", points: 0 },
    { id: "srh4",  name: "Aniket Verma",        role: "BAT",  team: "SRH", credits: 8.0,  status: "playing", points: 0 },
    { id: "srh5",  name: "Smaran Ravichandran", role: "BAT",  team: "SRH", credits: 7.5,  status: "playing", points: 0 },
    { id: "srh6",  name: "Salil Arora",         role: "WK",   team: "SRH", credits: 7.0,  status: "playing", points: 0 },
    // All-Rounders
    { id: "srh7",  name: "Abhishek Sharma",     role: "AR",   team: "SRH", credits: 9.5,  status: "playing", points: 0 },
    { id: "srh8",  name: "Nitish Kumar Reddy",  role: "AR",   team: "SRH", credits: 9.0,  status: "playing", points: 0 },
    { id: "srh9",  name: "Liam Livingstone",    role: "AR",   team: "SRH", credits: 9.5,  status: "playing", points: 0 },
    { id: "srh10", name: "Kamindu Mendis",      role: "AR",   team: "SRH", credits: 9.0,  status: "playing", points: 0 },
    { id: "srh11", name: "Harshal Patel",       role: "AR",   team: "SRH", credits: 8.5,  status: "playing", points: 0 },
    { id: "srh12", name: "Brydon Carse",        role: "AR",   team: "SRH", credits: 8.5,  status: "playing", points: 0 },
    { id: "srh13", name: "Jack Edwards",        role: "AR",   team: "SRH", credits: 8.0,  status: "playing", points: 0 },
    { id: "srh14", name: "Harsh Dubey",         role: "AR",   team: "SRH", credits: 8.0,  status: "playing", points: 0 },
    { id: "srh15", name: "Shivang Kumar",       role: "AR",   team: "SRH", credits: 7.5,  status: "playing", points: 0 },
    // Bowlers
    { id: "srh16", name: "Pat Cummins",         role: "BOWL", team: "SRH", credits: 10.5, status: "playing", points: 0 },
    { id: "srh17", name: "Shivam Mavi",         role: "BOWL", team: "SRH", credits: 8.5,  status: "playing", points: 0 },
    { id: "srh18", name: "Jaydev Unadkat",      role: "BOWL", team: "SRH", credits: 8.0,  status: "playing", points: 0 },
    { id: "srh19", name: "Zeeshan Ansari",      role: "BOWL", team: "SRH", credits: 8.0,  status: "playing", points: 0 },
    { id: "srh20", name: "Eshan Malinga",       role: "BOWL", team: "SRH", credits: 7.5,  status: "playing", points: 0 },
    { id: "srh21", name: "Sakib Hussain",       role: "BOWL", team: "SRH", credits: 7.5,  status: "playing", points: 0 },
    { id: "srh22", name: "Onkar Tarmale",       role: "BOWL", team: "SRH", credits: 7.0,  status: "playing", points: 0 },
    { id: "srh23", name: "Amit Kumar",          role: "BOWL", team: "SRH", credits: 7.0,  status: "playing", points: 0 },
    { id: "srh24", name: "Praful Hinge",        role: "BOWL", team: "SRH", credits: 7.0,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // DELHI CAPITALS (DC)
  // Captain: Axar Patel
  // ─────────────────────────────────────────
  "DC": [
    // Batters / WK
    { id: "dc1",  name: "KL Rahul",             role: "WK",   team: "DC", credits: 10.5, status: "playing", points: 0 },
    { id: "dc2",  name: "Karun Nair",           role: "BAT",  team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc3",  name: "David Miller",         role: "BAT",  team: "DC", credits: 9.0,  status: "playing", points: 0 },
    { id: "dc4",  name: "Ben Duckett",          role: "WK",   team: "DC", credits: 9.0,  status: "playing", points: 0 },
    { id: "dc5",  name: "Pathum Nissanka",      role: "BAT",  team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc6",  name: "Prithvi Shaw",         role: "BAT",  team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc7",  name: "Abishek Porel",        role: "WK",   team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc8",  name: "Tristan Stubbs",       role: "WK",   team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc9",  name: "Sahil Parakh",         role: "BAT",  team: "DC", credits: 7.5,  status: "playing", points: 0 },
    // All-Rounders
    { id: "dc10", name: "Axar Patel",           role: "AR",   team: "DC", credits: 10.0, status: "playing", points: 0 },
    { id: "dc11", name: "Nitish Rana",          role: "AR",   team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc12", name: "Sameer Rizvi",         role: "AR",   team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc13", name: "Ashutosh Sharma",      role: "AR",   team: "DC", credits: 8.0,  status: "playing", points: 0 },
    { id: "dc14", name: "Vipraj Nigam",         role: "AR",   team: "DC", credits: 7.5,  status: "playing", points: 0 },
    { id: "dc15", name: "Ajay Mandal",          role: "AR",   team: "DC", credits: 7.5,  status: "playing", points: 0 },
    { id: "dc16", name: "Tripurana Vijay",      role: "AR",   team: "DC", credits: 7.5,  status: "playing", points: 0 },
    { id: "dc17", name: "Madhav Tiwari",        role: "AR",   team: "DC", credits: 7.0,  status: "playing", points: 0 },
    { id: "dc18", name: "Auqib Dar",            role: "AR",   team: "DC", credits: 7.0,  status: "playing", points: 0 },
    // Bowlers
    { id: "dc19", name: "Mitchell Starc",       role: "BOWL", team: "DC", credits: 10.5, status: "playing", points: 0 },
    { id: "dc20", name: "Kuldeep Yadav",        role: "BOWL", team: "DC", credits: 9.0,  status: "playing", points: 0 },
    { id: "dc21", name: "T. Natarajan",         role: "BOWL", team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc22", name: "Kyle Jamieson",        role: "BOWL", team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc23", name: "Mukesh Kumar",         role: "BOWL", team: "DC", credits: 8.0,  status: "playing", points: 0 },
    { id: "dc24", name: "Lungi Ngidi",          role: "BOWL", team: "DC", credits: 8.5,  status: "playing", points: 0 },
    { id: "dc25", name: "Dushmantha Chameera",  role: "BOWL", team: "DC", credits: 8.0,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // LUCKNOW SUPER GIANTS (LSG)
  // Captain: Rishabh Pant
  // ─────────────────────────────────────────
  "LSG": [
    // Batters / WK
    { id: "lsg1",  name: "Rishabh Pant",        role: "WK",   team: "LSG", credits: 11.0, status: "playing", points: 0 },
    { id: "lsg2",  name: "Nicholas Pooran",     role: "WK",   team: "LSG", credits: 9.5,  status: "playing", points: 0 },
    { id: "lsg3",  name: "Aiden Markram",       role: "BAT",  team: "LSG", credits: 9.0,  status: "playing", points: 0 },
    { id: "lsg4",  name: "Josh Inglis",         role: "WK",   team: "LSG", credits: 8.5,  status: "playing", points: 0 },
    { id: "lsg5",  name: "Matthew Breetzke",    role: "BAT",  team: "LSG", credits: 8.0,  status: "playing", points: 0 },
    { id: "lsg6",  name: "Himmat Singh",        role: "BAT",  team: "LSG", credits: 8.0,  status: "playing", points: 0 },
    { id: "lsg7",  name: "Akshat Raghuwanshi", role: "BAT",  team: "LSG", credits: 7.5,  status: "playing", points: 0 },
    { id: "lsg8",  name: "Mukul Choudhary",     role: "WK",   team: "LSG", credits: 7.5,  status: "playing", points: 0 },
    // All-Rounders
    { id: "lsg9",  name: "Mitchell Marsh",      role: "AR",   team: "LSG", credits: 10.0, status: "playing", points: 0 },
    { id: "lsg10", name: "Wanindu Hasaranga",   role: "AR",   team: "LSG", credits: 9.5,  status: "playing", points: 0 },
    { id: "lsg11", name: "Ayush Badoni",        role: "AR",   team: "LSG", credits: 8.5,  status: "playing", points: 0 },
    { id: "lsg12", name: "Abdul Samad",         role: "AR",   team: "LSG", credits: 8.5,  status: "playing", points: 0 },
    { id: "lsg13", name: "Shahbaz Ahmed",       role: "AR",   team: "LSG", credits: 8.5,  status: "playing", points: 0 },
    { id: "lsg14", name: "Arshin Kulkarni",     role: "AR",   team: "LSG", credits: 8.0,  status: "playing", points: 0 },
    // Bowlers
    { id: "lsg15", name: "Mohammad Shami",      role: "BOWL", team: "LSG", credits: 10.5, status: "playing", points: 0 },
    { id: "lsg16", name: "Anrich Nortje",       role: "BOWL", team: "LSG", credits: 9.5,  status: "playing", points: 0 },
    { id: "lsg17", name: "Mayank Yadav",        role: "BOWL", team: "LSG", credits: 9.0,  status: "playing", points: 0 },
    { id: "lsg18", name: "Avesh Khan",          role: "BOWL", team: "LSG", credits: 8.5,  status: "playing", points: 0 },
    { id: "lsg19", name: "Mohsin Khan",         role: "BOWL", team: "LSG", credits: 8.5,  status: "playing", points: 0 },
    { id: "lsg20", name: "M. Siddharth",        role: "BOWL", team: "LSG", credits: 8.0,  status: "playing", points: 0 },
    { id: "lsg21", name: "Digvesh Singh",       role: "BOWL", team: "LSG", credits: 7.5,  status: "playing", points: 0 },
    { id: "lsg22", name: "Akash Singh",         role: "BOWL", team: "LSG", credits: 7.5,  status: "playing", points: 0 },
    { id: "lsg23", name: "Prince Yadav",        role: "BOWL", team: "LSG", credits: 7.0,  status: "playing", points: 0 },
    { id: "lsg24", name: "Arjun Tendulkar",     role: "BOWL", team: "LSG", credits: 7.5,  status: "playing", points: 0 },
    { id: "lsg25", name: "Naman Tiwari",        role: "BOWL", team: "LSG", credits: 7.5,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // RAJASTHAN ROYALS (RR)
  // Captain: Riyan Parag
  // ─────────────────────────────────────────
  "RR": [
    // Batters / WK
    { id: "rr1",  name: "Yashasvi Jaiswal",     role: "BAT",  team: "RR", credits: 11.0, status: "playing", points: 0 },
    { id: "rr2",  name: "Riyan Parag",          role: "BAT",  team: "RR", credits: 9.5,  status: "playing", points: 0 },
    { id: "rr3",  name: "Vaibhav Suryavanshi",  role: "BAT",  team: "RR", credits: 9.0,  status: "playing", points: 0 },
    { id: "rr4",  name: "Shimron Hetmyer",      role: "BAT",  team: "RR", credits: 9.0,  status: "playing", points: 0 },
    { id: "rr5",  name: "Dhruv Jurel",          role: "WK",   team: "RR", credits: 9.0,  status: "playing", points: 0 },
    { id: "rr6",  name: "Donovan Ferreira",     role: "WK",   team: "RR", credits: 8.5,  status: "playing", points: 0 },
    { id: "rr7",  name: "Lhuan-dre Pretorius",  role: "WK",   team: "RR", credits: 8.0,  status: "playing", points: 0 },
    { id: "rr8",  name: "Shubham Dubey",        role: "BAT",  team: "RR", credits: 8.0,  status: "playing", points: 0 },
    { id: "rr9",  name: "Ravi Singh",           role: "BAT",  team: "RR", credits: 7.5,  status: "playing", points: 0 },
    { id: "rr10", name: "Aman Rao Perala",      role: "BAT",  team: "RR", credits: 7.0,  status: "playing", points: 0 },
    // All-Rounders
    { id: "rr11", name: "Ravindra Jadeja",      role: "AR",   team: "RR", credits: 10.5, status: "playing", points: 0 },
    { id: "rr12", name: "Sam Curran",           role: "AR",   team: "RR", credits: 9.5,  status: "playing", points: 0 },
    { id: "rr13", name: "Yudhvir Singh Charak", role: "AR",   team: "RR", credits: 8.0,  status: "playing", points: 0 },
    // Bowlers
    { id: "rr14", name: "Jofra Archer",         role: "BOWL", team: "RR", credits: 10.0, status: "playing", points: 0 },
    { id: "rr15", name: "Ravi Bishnoi",         role: "BOWL", team: "RR", credits: 9.0,  status: "playing", points: 0 },
    { id: "rr16", name: "Sandeep Sharma",       role: "BOWL", team: "RR", credits: 8.5,  status: "playing", points: 0 },
    { id: "rr17", name: "Tushar Deshpande",     role: "BOWL", team: "RR", credits: 8.5,  status: "playing", points: 0 },
    { id: "rr18", name: "Adam Milne",           role: "BOWL", team: "RR", credits: 8.5,  status: "playing", points: 0 },
    { id: "rr19", name: "Kwena Maphaka",        role: "BOWL", team: "RR", credits: 8.5,  status: "playing", points: 0 },
    { id: "rr20", name: "Nandre Burger",        role: "BOWL", team: "RR", credits: 8.5,  status: "playing", points: 0 },
    { id: "rr21", name: "Kuldeep Sen",          role: "BOWL", team: "RR", credits: 8.0,  status: "playing", points: 0 },
    { id: "rr22", name: "Sushant Mishra",       role: "BOWL", team: "RR", credits: 7.5,  status: "playing", points: 0 },
    { id: "rr23", name: "Yash Raj Punia",       role: "BOWL", team: "RR", credits: 7.5,  status: "playing", points: 0 },
    { id: "rr24", name: "Vignesh Puthur",       role: "BOWL", team: "RR", credits: 7.5,  status: "playing", points: 0 },
    { id: "rr25", name: "Brijesh Sharma",       role: "BOWL", team: "RR", credits: 7.0,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // GUJARAT TITANS (GT)
  // Captain: Shubman Gill
  // ─────────────────────────────────────────
  "GT": [
    // Batters / WK
    { id: "gt1",  name: "Shubman Gill",         role: "BAT",  team: "GT", credits: 11.0, status: "playing", points: 0 },
    { id: "gt2",  name: "Jos Buttler",          role: "WK",   team: "GT", credits: 10.5, status: "playing", points: 0 },
    { id: "gt3",  name: "Sai Sudharsan",        role: "BAT",  team: "GT", credits: 9.5,  status: "playing", points: 0 },
    { id: "gt4",  name: "Glenn Phillips",       role: "BAT",  team: "GT", credits: 9.0,  status: "playing", points: 0 },
    { id: "gt5",  name: "Shahrukh Khan",        role: "BAT",  team: "GT", credits: 8.5,  status: "playing", points: 0 },
    { id: "gt6",  name: "Kumar Kushagra",       role: "WK",   team: "GT", credits: 8.0,  status: "playing", points: 0 },
    { id: "gt7",  name: "Anuj Rawat",           role: "WK",   team: "GT", credits: 7.5,  status: "playing", points: 0 },
    { id: "gt8",  name: "Tom Banton",           role: "WK",   team: "GT", credits: 7.5,  status: "playing", points: 0 },
    // All-Rounders
    { id: "gt9",  name: "Washington Sundar",    role: "AR",   team: "GT", credits: 9.5,  status: "playing", points: 0 },
    { id: "gt10", name: "Jason Holder",         role: "AR",   team: "GT", credits: 9.0,  status: "playing", points: 0 },
    { id: "gt11", name: "Rahul Tewatia",        role: "AR",   team: "GT", credits: 8.5,  status: "playing", points: 0 },
    { id: "gt12", name: "Sai Kishore",          role: "AR",   team: "GT", credits: 8.5,  status: "playing", points: 0 },
    { id: "gt13", name: "Jayant Yadav",         role: "AR",   team: "GT", credits: 8.0,  status: "playing", points: 0 },
    { id: "gt14", name: "Nishant Sindhu",       role: "AR",   team: "GT", credits: 8.0,  status: "playing", points: 0 },
    { id: "gt15", name: "Mohd. Arshad Khan",    role: "AR",   team: "GT", credits: 7.5,  status: "playing", points: 0 },
    // Bowlers
    { id: "gt16", name: "Rashid Khan",          role: "BOWL", team: "GT", credits: 11.0, status: "playing", points: 0 },
    { id: "gt17", name: "Kagiso Rabada",        role: "BOWL", team: "GT", credits: 10.5, status: "playing", points: 0 },
    { id: "gt18", name: "Mohammed Siraj",       role: "BOWL", team: "GT", credits: 9.5,  status: "playing", points: 0 },
    { id: "gt19", name: "Prasidh Krishna",      role: "BOWL", team: "GT", credits: 9.0,  status: "playing", points: 0 },
    { id: "gt20", name: "Luke Wood",            role: "BOWL", team: "GT", credits: 8.5,  status: "playing", points: 0 },
    { id: "gt21", name: "Ishant Sharma",        role: "BOWL", team: "GT", credits: 8.0,  status: "playing", points: 0 },
    { id: "gt22", name: "Gurnoor Singh Brar",   role: "BOWL", team: "GT", credits: 8.0,  status: "playing", points: 0 },
    { id: "gt23", name: "Manav Suthar",         role: "BOWL", team: "GT", credits: 7.5,  status: "playing", points: 0 },
    { id: "gt24", name: "Ashok Sharma",         role: "BOWL", team: "GT", credits: 7.5,  status: "playing", points: 0 },
    { id: "gt25", name: "Prithvi Raj Yarra",    role: "BOWL", team: "GT", credits: 7.0,  status: "playing", points: 0 },
  ],

  // ─────────────────────────────────────────
  // PUNJAB KINGS (PBKS)
  // Captain: Shreyas Iyer
  // ─────────────────────────────────────────
  "PBKS": [
    // Batters / WK
    { id: "pbks1",  name: "Shreyas Iyer",       role: "BAT",  team: "PBKS", credits: 10.0, status: "playing", points: 0 },
    { id: "pbks2",  name: "Prabhsimran Singh",  role: "WK",   team: "PBKS", credits: 9.0,  status: "playing", points: 0 },
    { id: "pbks3",  name: "Shashank Singh",     role: "BAT",  team: "PBKS", credits: 9.0,  status: "playing", points: 0 },
    { id: "pbks4",  name: "Nehal Wadhera",      role: "BAT",  team: "PBKS", credits: 8.5,  status: "playing", points: 0 },
    { id: "pbks5",  name: "Priyansh Arya",      role: "BAT",  team: "PBKS", credits: 8.5,  status: "playing", points: 0 },
    { id: "pbks6",  name: "Vishnu Vinod",       role: "WK",   team: "PBKS", credits: 8.0,  status: "playing", points: 0 },
    { id: "pbks7",  name: "Harnoor Pannu",      role: "BAT",  team: "PBKS", credits: 7.5,  status: "playing", points: 0 },
    { id: "pbks8",  name: "Pyla Avinash",       role: "BAT",  team: "PBKS", credits: 7.5,  status: "playing", points: 0 },
    // All-Rounders
    { id: "pbks9",  name: "Marcus Stoinis",     role: "AR",   team: "PBKS", credits: 9.5,  status: "playing", points: 0 },
    { id: "pbks10", name: "Marco Jansen",       role: "AR",   team: "PBKS", credits: 9.5,  status: "playing", points: 0 },
    { id: "pbks11", name: "Azmatullah Omarzai", role: "AR",   team: "PBKS", credits: 9.0,  status: "playing", points: 0 },
    { id: "pbks12", name: "Cooper Connolly",    role: "AR",   team: "PBKS", credits: 8.5,  status: "playing", points: 0 },
    { id: "pbks13", name: "Mitch Owen",         role: "AR",   team: "PBKS", credits: 8.5,  status: "playing", points: 0 },
    { id: "pbks14", name: "Musheer Khan",       role: "AR",   team: "PBKS", credits: 8.5,  status: "playing", points: 0 },
    { id: "pbks15", name: "Harpreet Brar",      role: "AR",   team: "PBKS", credits: 8.0,  status: "playing", points: 0 },
    { id: "pbks16", name: "Suryansh Shedge",    role: "AR",   team: "PBKS", credits: 7.5,  status: "playing", points: 0 },
    { id: "pbks17", name: "Ben Dwarshuis",      role: "AR",   team: "PBKS", credits: 8.0,  status: "playing", points: 0 },
    // Bowlers
    { id: "pbks18", name: "Arshdeep Singh",     role: "BOWL", team: "PBKS", credits: 10.5, status: "playing", points: 0 },
    { id: "pbks19", name: "Yuzvendra Chahal",   role: "BOWL", team: "PBKS", credits: 10.0, status: "playing", points: 0 },
    { id: "pbks20", name: "Lockie Ferguson",    role: "BOWL", team: "PBKS", credits: 9.0,  status: "playing", points: 0 },
    { id: "pbks21", name: "Xavier Bartlett",    role: "BOWL", team: "PBKS", credits: 8.5,  status: "playing", points: 0 },
    { id: "pbks22", name: "Vyshak Vijaykumar",  role: "BOWL", team: "PBKS", credits: 8.5,  status: "playing", points: 0 },
    { id: "pbks23", name: "Yash Thakur",        role: "BOWL", team: "PBKS", credits: 8.0,  status: "playing", points: 0 },
    { id: "pbks24", name: "Pravin Dubey",       role: "BOWL", team: "PBKS", credits: 7.5,  status: "playing", points: 0 },
    { id: "pbks25", name: "Vishal Nishad",      role: "BOWL", team: "PBKS", credits: 7.0,  status: "playing", points: 0 },
  ],

};

const fetchScore = async (matchId: string) => {
  try {
    const URL = `${CRICBUZZ_URL}/live-cricket-scores/${matchId}`;
    const response = await axios.get(URL, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    
    // Try to extract from Next.js data
    const matchInfoMatch = html.match(/matchInfo\\":(\{.*?\})(?=,"matchScore|,"currBatTeamId)/);
    const matchScoreMatch = html.match(/matchScore\\":(\{.*?\})(?=,"team1Score|,"team2Score|,"inngs1|,"inngs2)/);
    
    if (matchInfoMatch && matchScoreMatch) {
      const info = JSON.parse(matchInfoMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      const score = JSON.parse(matchScoreMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      
      const team1Score = score.team1Score?.inngs1 || score.team1Score?.inngs2;
      const team2Score = score.team2Score?.inngs1 || score.team2Score?.inngs2;
      
      const liveScore = team1Score ? `${team1Score.runs}/${team1Score.wickets} (${team1Score.overs})` : 
                        (team2Score ? `${team2Score.runs}/${team2Score.wickets} (${team2Score.overs})` : "0/0 (0.0)");

      return {
        title: `${info.seriesName}, ${info.matchDesc}`,
        update: info.status || info.shortStatus || "Match in Progress",
        liveScore,
        batsmanOne: "Playing",
        batsmanOneRun: "",
        batsmanOneBall: "",
        bowlerOne: "Bowling",
        bowlerOneOver: "",
        bowlerOneRun: "",
        bowlerOneWickets: ""
      };
    }

    // Fallback to old selectors
    const $ = cheerio.load(html);
    const update = $('.cb-col.cb-col-100.cb-min-stts.cb-text-complete').text().trim() || 'Match Stats will Update Soon';
    const process = $('.cb-text-inprogress').text().trim() || 'Match Stats will Update Soon';
    
    return {
      'title': $('.cb-nav-hdr.cb-font-18.line-ht24').text().trim().replace(', Commentary', ''),
      'update': update !== 'Match Stats will Update Soon' ? update : process || 'Match Stats will Update Soon...',
      'liveScore': $('.cb-font-20.text-bold').text().trim(),
      'batsmanOne': $('.cb-col.cb-col-50').eq(1).text().trim(),
      'batsmanOneRun': $('.cb-col.cb-col-10.ab.text-right').eq(0).text().trim(),
      'batsmanOneBall': '(' + $('.cb-col.cb-col-10.ab.text-right').eq(1).text().trim() + ')',
      'bowlerOne': $('.cb-col.cb-col-50').eq(4).text().trim(),
      'bowlerOneOver': $('.cb-col.cb-col-10.text-right').eq(4).text().trim(),
      'bowlerOneRun': $('.cb-col.cb-col-10.text-right').eq(5).text().trim(),
      'bowlerOneWickets': $('.cb-col.cb-col-8.text-right').eq(5).text().trim(),
    };
  } catch (e) {
    throw new Error("Something went wrong");
  }
};

const fetchSquads = async (matchId: string) => {
  try {
    const URL = `${CRICBUZZ_URL}/cricket-match-squads/${matchId}`;
    const response = await axios.get(URL, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const players: any[] = [];

    // Try to extract from Next.js data
    // Look for player objects: {"id":123,"name":"...","role":"..."}
    const playerRegex = /\{"id":(\d+),"name":"(.*?)","role":"(.*?)"/g;
    let match;
    while ((match = playerRegex.exec(html)) !== null) {
      const id = match[1];
      const name = match[2].replace(/\\"/g, '"');
      const roleRaw = match[3].toLowerCase();
      
      let role = "BAT";
      if (roleRaw.includes("wk") || roleRaw.includes("keeper")) role = "WK";
      else if (roleRaw.includes("all") || roleRaw.includes("ar")) role = "AR";
      else if (roleRaw.includes("bowl")) role = "BOWL";

      if (!players.find(p => p.id === id)) {
        players.push({
          id,
          name,
          role,
          team: "TBD", // Team info might be in a parent block
          credits: 8.5 + (Math.random() * 3),
          status: "playing",
          points: 0
        });
      }
    }

    if (players.length > 0) return players;

    // Fallback to old selectors
    const $ = cheerio.load(html);

    // Cricbuzz squads page usually has two columns for the two teams
    $('.cb-col.cb-col-100.cb-bg-white').find('.cb-col.cb-col-50').each((i, teamCol) => {
      const teamName = $(teamCol).find('.cb-nav-hdr').text().trim() || `Team ${i + 1}`;
      $(teamCol).find('a.cb-plyr-nm').each((j, playerEl) => {
        const name = $(playerEl).text().trim();
        const href = $(playerEl).attr('href') || '';
        const id = href.split('/')[2] || `p-${i}-${j}`;
        
        // Try to determine role from the text around the player name
        // Cricbuzz often lists role in a span or div nearby
        const roleText = $(playerEl).parent().find('.cb-font-12.text-gray').text().trim().toLowerCase();
        let role = "BAT";
        if (roleText.includes("wk") || roleText.includes("keeper")) role = "WK";
        else if (roleText.includes("allrounder") || roleText.includes("ar")) role = "AR";
        else if (roleText.includes("bowler") || roleText.includes("bowl")) role = "BOWL";

        players.push({
          id,
          name,
          role,
          team: teamName,
          credits: 8.5 + (Math.random() * 2), // Random credits for fantasy feel
          status: "playing",
          points: 0
        });
      });
    });
    return players;
  } catch (e) {
    console.error("Squad fetch failed:", e);
    return [];
  }
};

const fetchMatches = async (endpoint: string, origin = "international") => {
  try {
    const actualEndpoint = endpoint === "live-cricket-scores" ? "live-scores" : endpoint;
    const URL = `${CRICBUZZ_URL}/cricket-match/${actualEndpoint}`;
    const response = await axios.get(URL, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = response.data;
    const matches: any[] = [];

    // 1. Try to extract from Next.js data (self.__next_f.push)
    // This is more robust for the new Cricbuzz site
    const matchInfoRegex = /matchInfo\\":(\{.*?\})(?=,"matchScore|,"currBatTeamId|,"isTournament|,"seriesStartDt)/g;
    const matchScoreRegex = /matchScore\\":(\{.*?\})(?=,"team1Score|,"team2Score|,"inngs1|,"inngs2|,"inningsId|,"runs|,"wickets|,"overs|,"isForecastEnabled)/g;
    
    // Actually, a simpler way is to find the whole match object
    // The format is roughly: {\"match\":{\"matchInfo\":{...},\"matchScore\":{...}}}
    // But it's escaped: {\\\"match\\\":{\\\"matchInfo\\\":{...}}}
    
    // Let's try to find all matchInfo blocks first
    const matchBlocks = html.match(/matchInfo\\":\{.*?\}/g) || [];
    
    matchBlocks.forEach((block: string) => {
      try {
        // Unescape the block
        const unescaped = block.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const jsonStr = "{" + unescaped + "}";
        const data = JSON.parse(jsonStr);
        const info = data.matchInfo;
        
        if (info) {
          // Try to find the corresponding score in the same chunk of HTML if possible
          // For now, we'll just extract what we can from the info block
          
          const matchObject = {
            id: info.matchId?.toString(),
            title: `${info.seriesName}, ${info.matchDesc}`,
            team1: info.team1?.teamName,
            team2: info.team2?.teamName,
            status: info.state === "In Progress" ? "live" : (info.state === "Complete" ? "completed" : "upcoming"),
            overview: info.status || info.shortStatus,
            score: info.shortStatus || ""
          };
          
          if (matchObject.id && matchObject.team1) {
            if (!matches.find(m => m.id === matchObject.id)) {
              matches.push(matchObject);
            }
          }
        }
      } catch (e) {
        // Skip invalid blocks
      }
    });

    // 2. Fallback to old cheerio selectors if no matches found
    if (matches.length === 0) {
      const $ = cheerio.load(html);
      $(`.cb-plyr-tbody[ng-show="active_match_type == '${origin}-tab'"] .cb-col-100.cb-col`).each((index, matchElement) => {
        const titleElement = $(matchElement).find('.cb-lv-scr-mtch-hdr a');
        const title = titleElement.text().trim();
        const hrefAttribute = titleElement.attr('href');
        const matchId = hrefAttribute ? hrefAttribute.match(/\/(\d+)\//)?.[1] : null;

        const teams: any[] = [];
        $(matchElement).find('.cb-hmscg-tm-nm').each((i, teamElement) => {
          const teamName = $(teamElement).text().trim();
          const run = $(matchElement).find('.cb-ovr-flo').filter(':not(.cb-hmscg-tm-nm)').eq(i).text().trim();
          const senitizeRun = run.split(teamName).join("");

          teams.push({
            team: teamName,
            run: senitizeRun,
          });
        });

        const timeAndPlaceElement = $(matchElement).find('div.text-gray');
        const date = timeAndPlaceElement.find('span').eq(0).text().trim();
        const time = timeAndPlaceElement.find('span').eq(2).text().trim();
        const place = timeAndPlaceElement.find('span.text-gray').text().trim();

        const overViewIfLive = $(matchElement).find(".cb-text-live").text().trim();
        const overViewIfComplete = $(matchElement).find(".cb-text-complete").text().trim();
        const overViewIfUpcoming = $(matchElement).find(".cb-text-preview").text().trim();

        const matchObject = {
          id: matchId,
          title,
          team1: teams[0]?.team,
          team2: teams[1]?.team,
          score: teams.map(t => `${t.team} ${t.run}`).join(" vs "),
          overview: overViewIfLive || overViewIfComplete || overViewIfUpcoming,
          status: overViewIfLive ? "live" : (overViewIfComplete ? "completed" : "upcoming")
        };

        if (matchId && title.length) {
          if (!matches.find(match => match.id === matchId)) {
            matches.push(matchObject);
          }
        }
      });
    }

    return matches;
  } catch (error: any) {
    console.error(`Scraping ${endpoint} failed:`, error.message);
    return [];
  }
};

// API Routes
// ─────────────────────────────────────────────────────────────────────────────
// IPL 2026 – COMPLETE LEAGUE SCHEDULE (70 matches)
//
// Time convention (IST → UTC):
//   3:30 PM IST  =  10:00:00Z  (UTC+5:30, so 03:30 - 05:30 = -2h → 10:00Z)
//   7:30 PM IST  =  14:00:00Z  (19:30 - 05:30 = 14:00Z)
//
// Results:
//   Match 1–5  →  completed  (real scores as of 1 Apr 2026)
//   Match 6+   →  status: "" (upcoming / to be played)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_MATCHES = [

  // ── MATCH 1 ── 28 Mar  7:30 PM IST  Bengaluru ──────────────────────────────
  {
    id: "1",
    team1: "RCB",
    team2: "SRH",
    venue: "M. Chinnaswamy Stadium, Bengaluru",
    startTime: "2026-03-28T14:00:00Z",
    status: "completed",
    score: "201/9 (20.0) vs 203/4 (15.4)",
    result: "Royal Challengers Bengaluru won by 6 wickets"
  },

  // ── MATCH 2 ── 29 Mar  7:30 PM IST  Mumbai ─────────────────────────────────
  {
    id: "2",
    team1: "MI",
    team2: "KKR",
    venue: "Wankhede Stadium, Mumbai",
    startTime: "2026-03-29T14:00:00Z",
    status: "completed",
    score: "220/4 (20.0) vs 224/4 (19.1)",
    result: "Mumbai Indians won by 6 wickets"
  },

  // ── MATCH 3 ── 30 Mar  7:30 PM IST  Guwahati ──────────────────────────────
  {
    id: "3",
    team1: "RR",
    team2: "CSK",
    venue: "Barsapara Cricket Stadium, Guwahati",
    startTime: "2026-03-30T14:00:00Z",
    status: "completed",
    score: "127/10 (19.4) vs 128/2 (12.1)",
    result: "Rajasthan Royals won by 8 wickets"
  },

  // ── MATCH 4 ── 31 Mar  7:30 PM IST  New Chandigarh ────────────────────────
  {
    id: "4",
    team1: "PBKS",
    team2: "GT",
    venue: "Maharaja Yadavindra Singh International Cricket Stadium, New Chandigarh",
    startTime: "2026-03-31T14:00:00Z",
    status: "completed",
    score: "162/6 (20.0) vs 165/7 (19.1)",
    result: "Punjab Kings won by 3 wickets"
  },

  // ── MATCH 5 ── 1 Apr  7:30 PM IST  Lucknow ────────────────────────────────
  {
    id: "5",
    team1: "LSG",
    team2: "DC",
    venue: "BRSABV Ekana Cricket Stadium, Lucknow",
    startTime: "2026-04-01T14:00:00Z",
    status: "completed",
    score: "141/10 (20.0) vs 142/4 (16.3)",
    result: "Delhi Capitals won by 6 wickets"
  },

  // ── MATCH 6 ── 2 Apr  7:30 PM IST  Kolkata ────────────────────────────────
  {
    id: "6",
    team1: "KKR",
    team2: "SRH",
    venue: "Eden Gardens, Kolkata",
    startTime: "2026-04-02T14:00:00Z",
    status: "live",
    score: "SRH 83/1 (5.5)",
    result: "KKR opt to bowl"
  },

  // ── MATCH 7 ── 3 Apr  7:30 PM IST  Chennai ────────────────────────────────
  {
    id: "7",
    team1: "CSK",
    team2: "PBKS",
    venue: "MA Chidambaram Stadium, Chennai",
    startTime: "2026-04-03T14:00:00Z",
    status: ""
  },

  // ── MATCH 8 ── 4 Apr  3:30 PM IST  Delhi ────────────────────────────────── (double-header)
  {
    id: "8",
    team1: "DC",
    team2: "MI",
    venue: "Arun Jaitley Stadium, Delhi",
    startTime: "2026-04-04T10:00:00Z",
    status: ""
  },

  // ── MATCH 9 ── 4 Apr  7:30 PM IST  Ahmedabad ─────────────────────────────  (double-header)
  {
    id: "9",
    team1: "GT",
    team2: "RR",
    venue: "Narendra Modi Stadium, Ahmedabad",
    startTime: "2026-04-04T14:00:00Z",
    status: ""
  },

  // ── MATCH 10 ── 5 Apr  3:30 PM IST  Hyderabad ────────────────────────────  (double-header)
  {
    id: "10",
    team1: "SRH",
    team2: "LSG",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    startTime: "2026-04-05T10:00:00Z",
    status: ""
  },

  // ── MATCH 11 ── 5 Apr  7:30 PM IST  Bengaluru ───────────────────────────── (double-header)
  {
    id: "11",
    team1: "RCB",
    team2: "CSK",
    venue: "M. Chinnaswamy Stadium, Bengaluru",
    startTime: "2026-04-05T14:00:00Z",
    status: ""
  },

  // ── MATCH 12 ── 6 Apr  7:30 PM IST  Kolkata ──────────────────────────────
  {
    id: "12",
    team1: "KKR",
    team2: "PBKS",
    venue: "Eden Gardens, Kolkata",
    startTime: "2026-04-06T14:00:00Z",
    status: ""
  },

  // ── MATCH 13 ── 7 Apr  7:30 PM IST  Guwahati ─────────────────────────────
  {
    id: "13",
    team1: "RR",
    team2: "MI",
    venue: "Barsapara Cricket Stadium, Guwahati",
    startTime: "2026-04-07T14:00:00Z",
    status: ""
  },

  // ── MATCH 14 ── 8 Apr  7:30 PM IST  Delhi ────────────────────────────────
  {
    id: "14",
    team1: "DC",
    team2: "GT",
    venue: "Arun Jaitley Stadium, Delhi",
    startTime: "2026-04-08T14:00:00Z",
    status: ""
  },

  // ── MATCH 15 ── 9 Apr  7:30 PM IST  Kolkata ──────────────────────────────
  {
    id: "15",
    team1: "KKR",
    team2: "LSG",
    venue: "Eden Gardens, Kolkata",
    startTime: "2026-04-09T14:00:00Z",
    status: ""
  },

  // ── MATCH 16 ── 10 Apr  7:30 PM IST  Guwahati ────────────────────────────
  {
    id: "16",
    team1: "RR",
    team2: "RCB",
    venue: "Barsapara Cricket Stadium, Guwahati",
    startTime: "2026-04-10T14:00:00Z",
    status: ""
  },

  // ── MATCH 17 ── 11 Apr  3:30 PM IST  New Chandigarh ──────────────────────  (double-header)
  {
    id: "17",
    team1: "PBKS",
    team2: "SRH",
    venue: "Maharaja Yadavindra Singh International Cricket Stadium, New Chandigarh",
    startTime: "2026-04-11T10:00:00Z",
    status: ""
  },

  // ── MATCH 18 ── 11 Apr  7:30 PM IST  Chennai ─────────────────────────────  (double-header)
  {
    id: "18",
    team1: "CSK",
    team2: "DC",
    venue: "MA Chidambaram Stadium, Chennai",
    startTime: "2026-04-11T14:00:00Z",
    status: ""
  },

  // ── MATCH 19 ── 12 Apr  3:30 PM IST  Lucknow ─────────────────────────────  (double-header)
  {
    id: "19",
    team1: "LSG",
    team2: "GT",
    venue: "BRSABV Ekana Cricket Stadium, Lucknow",
    startTime: "2026-04-12T10:00:00Z",
    status: ""
  },

  // ── MATCH 20 ── 12 Apr  7:30 PM IST  Mumbai ───────────────────────────────  (double-header)
  {
    id: "20",
    team1: "MI",
    team2: "RCB",
    venue: "Wankhede Stadium, Mumbai",
    startTime: "2026-04-12T14:00:00Z",
    status: ""
  },

  // ── MATCH 21 ── 13 Apr  7:30 PM IST  Hyderabad ───────────────────────────
  {
    id: "21",
    team1: "SRH",
    team2: "RR",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    startTime: "2026-04-13T14:00:00Z",
    status: ""
  },

  // ── MATCH 22 ── 14 Apr  7:30 PM IST  Chennai ─────────────────────────────
  {
    id: "22",
    team1: "CSK",
    team2: "KKR",
    venue: "MA Chidambaram Stadium, Chennai",
    startTime: "2026-04-14T14:00:00Z",
    status: ""
  },

  // ── MATCH 23 ── 15 Apr  7:30 PM IST  Bengaluru ───────────────────────────
  {
    id: "23",
    team1: "RCB",
    team2: "LSG",
    venue: "M. Chinnaswamy Stadium, Bengaluru",
    startTime: "2026-04-15T14:00:00Z",
    status: ""
  },

  // ── MATCH 24 ── 16 Apr  7:30 PM IST  Mumbai ───────────────────────────────
  {
    id: "24",
    team1: "MI",
    team2: "PBKS",
    venue: "Wankhede Stadium, Mumbai",
    startTime: "2026-04-16T14:00:00Z",
    status: ""
  },

  // ── MATCH 25 ── 17 Apr  7:30 PM IST  Ahmedabad ───────────────────────────
  {
    id: "25",
    team1: "GT",
    team2: "KKR",
    venue: "Narendra Modi Stadium, Ahmedabad",
    startTime: "2026-04-17T14:00:00Z",
    status: ""
  },

  // ── MATCH 26 ── 18 Apr  3:30 PM IST  Bengaluru ───────────────────────────  (double-header)
  {
    id: "26",
    team1: "RCB",
    team2: "DC",
    venue: "M. Chinnaswamy Stadium, Bengaluru",
    startTime: "2026-04-18T10:00:00Z",
    status: ""
  },

  // ── MATCH 27 ── 18 Apr  7:30 PM IST  Hyderabad ───────────────────────────  (double-header)
  {
    id: "27",
    team1: "SRH",
    team2: "CSK",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    startTime: "2026-04-18T14:00:00Z",
    status: ""
  },

  // ── MATCH 28 ── 19 Apr  3:30 PM IST  Kolkata ─────────────────────────────  (double-header)
  {
    id: "28",
    team1: "KKR",
    team2: "RR",
    venue: "Eden Gardens, Kolkata",
    startTime: "2026-04-19T10:00:00Z",
    status: ""
  },

  // ── MATCH 29 ── 19 Apr  7:30 PM IST  New Chandigarh ──────────────────────  (double-header)
  {
    id: "29",
    team1: "PBKS",
    team2: "LSG",
    venue: "Maharaja Yadavindra Singh International Cricket Stadium, New Chandigarh",
    startTime: "2026-04-19T14:00:00Z",
    status: ""
  },

  // ── MATCH 30 ── 20 Apr  7:30 PM IST  Ahmedabad ───────────────────────────
  {
    id: "30",
    team1: "GT",
    team2: "MI",
    venue: "Narendra Modi Stadium, Ahmedabad",
    startTime: "2026-04-20T14:00:00Z",
    status: ""
  },

  // ── MATCH 31 ── 21 Apr  7:30 PM IST  Hyderabad ───────────────────────────
  {
    id: "31",
    team1: "SRH",
    team2: "DC",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    startTime: "2026-04-21T14:00:00Z",
    status: ""
  },

  // ── MATCH 32 ── 22 Apr  7:30 PM IST  Lucknow ─────────────────────────────
  {
    id: "32",
    team1: "LSG",
    team2: "RR",
    venue: "BRSABV Ekana Cricket Stadium, Lucknow",
    startTime: "2026-04-22T14:00:00Z",
    status: ""
  },

  // ── MATCH 33 ── 23 Apr  7:30 PM IST  Mumbai ───────────────────────────────
  {
    id: "33",
    team1: "MI",
    team2: "CSK",
    venue: "Wankhede Stadium, Mumbai",
    startTime: "2026-04-23T14:00:00Z",
    status: ""
  },

  // ── MATCH 34 ── 24 Apr  7:30 PM IST  Bengaluru ───────────────────────────
  {
    id: "34",
    team1: "RCB",
    team2: "GT",
    venue: "M. Chinnaswamy Stadium, Bengaluru",
    startTime: "2026-04-24T14:00:00Z",
    status: ""
  },

  // ── MATCH 35 ── 25 Apr  3:30 PM IST  Delhi ────────────────────────────────  (double-header)
  {
    id: "35",
    team1: "DC",
    team2: "PBKS",
    venue: "Arun Jaitley Stadium, Delhi",
    startTime: "2026-04-25T10:00:00Z",
    status: ""
  },

  // ── MATCH 36 ── 25 Apr  7:30 PM IST  Jaipur ──────────────────────────────  (double-header)
  {
    id: "36",
    team1: "RR",
    team2: "SRH",
    venue: "Sawai Mansingh Stadium, Jaipur",
    startTime: "2026-04-25T14:00:00Z",
    status: ""
  },

  // ── MATCH 37 ── 26 Apr  3:30 PM IST  Ahmedabad ───────────────────────────  (double-header)
  {
    id: "37",
    team1: "GT",
    team2: "CSK",
    venue: "Narendra Modi Stadium, Ahmedabad",
    startTime: "2026-04-26T10:00:00Z",
    status: ""
  },

  // ── MATCH 38 ── 26 Apr  7:30 PM IST  Lucknow ─────────────────────────────  (double-header)
  {
    id: "38",
    team1: "LSG",
    team2: "KKR",
    venue: "BRSABV Ekana Cricket Stadium, Lucknow",
    startTime: "2026-04-26T14:00:00Z",
    status: ""
  },

  // ── MATCH 39 ── 27 Apr  7:30 PM IST  Delhi ────────────────────────────────
  {
    id: "39",
    team1: "DC",
    team2: "RCB",
    venue: "Arun Jaitley Stadium, Delhi",
    startTime: "2026-04-27T14:00:00Z",
    status: ""
  },

  // ── MATCH 40 ── 28 Apr  7:30 PM IST  New Chandigarh ──────────────────────
  {
    id: "40",
    team1: "PBKS",
    team2: "RR",
    venue: "Maharaja Yadavindra Singh International Cricket Stadium, New Chandigarh",
    startTime: "2026-04-28T14:00:00Z",
    status: ""
  },

  // ── MATCH 41 ── 29 Apr  7:30 PM IST  Mumbai ───────────────────────────────
  {
    id: "41",
    team1: "MI",
    team2: "SRH",
    venue: "Wankhede Stadium, Mumbai",
    startTime: "2026-04-29T14:00:00Z",
    status: ""
  },

  // ── MATCH 42 ── 30 Apr  7:30 PM IST  Ahmedabad ───────────────────────────
  {
    id: "42",
    team1: "GT",
    team2: "RCB",
    venue: "Narendra Modi Stadium, Ahmedabad",
    startTime: "2026-04-30T14:00:00Z",
    status: ""
  },

  // ── MATCH 43 ── 1 May  7:30 PM IST  Jaipur ───────────────────────────────
  {
    id: "43",
    team1: "RR",
    team2: "DC",
    venue: "Sawai Mansingh Stadium, Jaipur",
    startTime: "2026-05-01T14:00:00Z",
    status: ""
  },

  // ── MATCH 44 ── 2 May  7:30 PM IST  Chennai ──────────────────────────────
  {
    id: "44",
    team1: "CSK",
    team2: "MI",
    venue: "MA Chidambaram Stadium, Chennai",
    startTime: "2026-05-02T14:00:00Z",
    status: ""
  },

  // ── MATCH 45 ── 3 May  3:30 PM IST  Hyderabad ────────────────────────────  (double-header)
  {
    id: "45",
    team1: "SRH",
    team2: "KKR",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    startTime: "2026-05-03T10:00:00Z",
    status: ""
  },

  // ── MATCH 46 ── 3 May  7:30 PM IST  Ahmedabad ────────────────────────────  (double-header)
  {
    id: "46",
    team1: "GT",
    team2: "PBKS",
    venue: "Narendra Modi Stadium, Ahmedabad",
    startTime: "2026-05-03T14:00:00Z",
    status: ""
  },

  // ── MATCH 47 ── 4 May  7:30 PM IST  Mumbai ───────────────────────────────
  {
    id: "47",
    team1: "MI",
    team2: "LSG",
    venue: "Wankhede Stadium, Mumbai",
    startTime: "2026-05-04T14:00:00Z",
    status: ""
  },

  // ── MATCH 48 ── 5 May  7:30 PM IST  Delhi ────────────────────────────────
  {
    id: "48",
    team1: "DC",
    team2: "CSK",
    venue: "Arun Jaitley Stadium, Delhi",
    startTime: "2026-05-05T14:00:00Z",
    status: ""
  },

  // ── MATCH 49 ── 6 May  7:30 PM IST  Hyderabad ────────────────────────────
  {
    id: "49",
    team1: "SRH",
    team2: "PBKS",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    startTime: "2026-05-06T14:00:00Z",
    status: ""
  },

  // ── MATCH 50 ── 7 May  7:30 PM IST  Lucknow ──────────────────────────────
  {
    id: "50",
    team1: "LSG",
    team2: "RCB",
    venue: "BRSABV Ekana Cricket Stadium, Lucknow",
    startTime: "2026-05-07T14:00:00Z",
    status: ""
  },

  // ── MATCH 51 ── 8 May  7:30 PM IST  Delhi ────────────────────────────────
  {
    id: "51",
    team1: "DC",
    team2: "KKR",
    venue: "Arun Jaitley Stadium, Delhi",
    startTime: "2026-05-08T14:00:00Z",
    status: ""
  },

  // ── MATCH 52 ── 9 May  7:30 PM IST  Jaipur ───────────────────────────────
  {
    id: "52",
    team1: "RR",
    team2: "GT",
    venue: "Sawai Mansingh Stadium, Jaipur",
    startTime: "2026-05-09T14:00:00Z",
    status: ""
  },

  // ── MATCH 53 ── 10 May  3:30 PM IST  Chennai ──────────────────────────────  (double-header)
  {
    id: "53",
    team1: "CSK",
    team2: "LSG",
    venue: "MA Chidambaram Stadium, Chennai",
    startTime: "2026-05-10T10:00:00Z",
    status: ""
  },

  // ── MATCH 54 ── 10 May  7:30 PM IST  Raipur ───────────────────────────────  (double-header)
  {
    id: "54",
    team1: "RCB",
    team2: "MI",
    venue: "Shaheed Veer Narayan Singh International Stadium, Raipur",
    startTime: "2026-05-10T14:00:00Z",
    status: ""
  },

  // ── MATCH 55 ── 11 May  7:30 PM IST  Dharamsala ──────────────────────────
  {
    id: "55",
    team1: "PBKS",
    team2: "DC",
    venue: "HPCA Stadium, Dharamsala",
    startTime: "2026-05-11T14:00:00Z",
    status: ""
  },

  // ── MATCH 56 ── 12 May  7:30 PM IST  Ahmedabad ───────────────────────────
  {
    id: "56",
    team1: "GT",
    team2: "SRH",
    venue: "Narendra Modi Stadium, Ahmedabad",
    startTime: "2026-05-12T14:00:00Z",
    status: ""
  },

  // ── MATCH 57 ── 13 May  7:30 PM IST  Raipur ───────────────────────────────
  {
    id: "57",
    team1: "RCB",
    team2: "KKR",
    venue: "Shaheed Veer Narayan Singh International Stadium, Raipur",
    startTime: "2026-05-13T14:00:00Z",
    status: ""
  },

  // ── MATCH 58 ── 14 May  7:30 PM IST  Dharamsala ──────────────────────────
  {
    id: "58",
    team1: "PBKS",
    team2: "MI",
    venue: "HPCA Stadium, Dharamsala",
    startTime: "2026-05-14T14:00:00Z",
    status: ""
  },

  // ── MATCH 59 ── 15 May  7:30 PM IST  Lucknow ─────────────────────────────
  {
    id: "59",
    team1: "LSG",
    team2: "CSK",
    venue: "BRSABV Ekana Cricket Stadium, Lucknow",
    startTime: "2026-05-15T14:00:00Z",
    status: ""
  },

  // ── MATCH 60 ── 16 May  7:30 PM IST  Kolkata ─────────────────────────────
  {
    id: "60",
    team1: "KKR",
    team2: "GT",
    venue: "Eden Gardens, Kolkata",
    startTime: "2026-05-16T14:00:00Z",
    status: ""
  },

  // ── MATCH 61 ── 17 May  3:30 PM IST  Dharamsala ──────────────────────────  (double-header)
  {
    id: "61",
    team1: "PBKS",
    team2: "RCB",
    venue: "HPCA Stadium, Dharamsala",
    startTime: "2026-05-17T10:00:00Z",
    status: ""
  },

  // ── MATCH 62 ── 17 May  7:30 PM IST  Delhi ────────────────────────────────  (double-header)
  {
    id: "62",
    team1: "DC",
    team2: "RR",
    venue: "Arun Jaitley Stadium, Delhi",
    startTime: "2026-05-17T14:00:00Z",
    status: ""
  },

  // ── MATCH 63 ── 18 May  7:30 PM IST  Chennai ─────────────────────────────
  {
    id: "63",
    team1: "CSK",
    team2: "SRH",
    venue: "MA Chidambaram Stadium, Chennai",
    startTime: "2026-05-18T14:00:00Z",
    status: ""
  },

  // ── MATCH 64 ── 19 May  7:30 PM IST  Jaipur ──────────────────────────────
  {
    id: "64",
    team1: "RR",
    team2: "LSG",
    venue: "Sawai Mansingh Stadium, Jaipur",
    startTime: "2026-05-19T14:00:00Z",
    status: ""
  },

  // ── MATCH 65 ── 20 May  7:30 PM IST  Kolkata ─────────────────────────────
  {
    id: "65",
    team1: "KKR",
    team2: "MI",
    venue: "Eden Gardens, Kolkata",
    startTime: "2026-05-20T14:00:00Z",
    status: ""
  },

  // ── MATCH 66 ── 21 May  7:30 PM IST  Chennai ─────────────────────────────
  {
    id: "66",
    team1: "CSK",
    team2: "GT",
    venue: "MA Chidambaram Stadium, Chennai",
    startTime: "2026-05-21T14:00:00Z",
    status: ""
  },

  // ── MATCH 67 ── 22 May  7:30 PM IST  Hyderabad ───────────────────────────
  {
    id: "67",
    team1: "SRH",
    team2: "RCB",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    startTime: "2026-05-22T14:00:00Z",
    status: ""
  },

  // ── MATCH 68 ── 23 May  7:30 PM IST  Lucknow ─────────────────────────────
  {
    id: "68",
    team1: "LSG",
    team2: "PBKS",
    venue: "BRSABV Ekana Cricket Stadium, Lucknow",
    startTime: "2026-05-23T14:00:00Z",
    status: ""
  },

  // ── MATCH 69 ── 24 May  3:30 PM IST  Mumbai ───────────────────────────────  (double-header)
  {
    id: "69",
    team1: "MI",
    team2: "RR",
    venue: "Wankhede Stadium, Mumbai",
    startTime: "2026-05-24T10:00:00Z",
    status: ""
  },

  // ── MATCH 70 ── 24 May  7:30 PM IST  Kolkata ─────────────────────────────  (double-header)
  {
    id: "70",
    team1: "KKR",
    team2: "DC",
    venue: "Eden Gardens, Kolkata",
    startTime: "2026-05-24T14:00:00Z",
    status: ""
  },

];

// Helper to sync mock matches to Firestore if they don't exist
async function syncMatchesToFirestore() {
  if (!dbAdmin) {
    console.warn("Skipping syncMatchesToFirestore: Firestore not initialized.");
    return;
  }
  console.log("Starting syncMatchesToFirestore...");
  try {
    const matchesRef = dbAdmin.collection("matches");
    console.log("Fetching matches snapshot from collection:", matchesRef.path);
    const snapshot = await matchesRef.limit(1).get();
    
    if (snapshot.empty) {
      console.log("Firestore 'matches' collection is empty. Initializing with MOCK_MATCHES...");
      const batch = dbAdmin.batch();
      let count = 0;
      MOCK_MATCHES.forEach(match => {
        const docRef = matchesRef.doc(match.id);
        batch.set(docRef, {
          ...match,
          status: match.status || "upcoming"
        });
        count++;
      });
      await batch.commit();
      console.log(`Firestore initialized successfully with ${count} matches.`);
    } else {
      console.log("Firestore 'matches' collection already has data. Skipping initialization.");
    }
  } catch (e) {
    console.error("Error in syncMatchesToFirestore:", e);
    const isPermissionDenied = e instanceof Error && e.message.includes("PERMISSION_DENIED");
    const isNotFound = e instanceof Error && e.message.includes("NOT_FOUND");
    
    if (isPermissionDenied || isNotFound) {
      console.error(`CRITICAL: Firestore ${isNotFound ? 'database not found' : 'permission denied'}.`);
      
      // Attempt fallback to default database if not already using it
      if (!isUsingFallbackDb && firebaseConfig.firestoreDatabaseId) {
        console.log("Attempting fallback to default database for sync...");
        try {
          const dbDefault = getFirestore(admin.apps[0]);
          dbAdmin = dbDefault;
          isUsingFallbackDb = true;
          // Retry sync once
          await syncMatchesToFirestore();
        } catch (e2) {
          console.error("Sync fallback failed:", e2);
        }
      }
    }
  }
}

// Run sync on startup
syncMatchesToFirestore().catch(e => console.error("Initial sync failed:", e));

let cachedMatches: any[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

app.get("/api/matches", async (req, res) => {
  try {
    if (!dbAdmin) {
      console.warn("Firestore not initialized, falling back to MOCK_MATCHES");
      return res.json(MOCK_MATCHES);
    }
    
    // Return cache if valid (10 min TTL)
    if (cachedMatches.length > 0 && (Date.now() - lastFetchTime < CACHE_TTL)) {
      const finalMatches = cachedMatches.map(m => ({
        ...m,
        status: m.status || "upcoming"
      }));
      return res.json(finalMatches);
    }

    // 1. Fetch from Firestore (Source of Truth)
    let currentMatches: any[] = [];
    try {
      if (!dbAdmin) throw new Error("Firestore not initialized");
      
      const matchesRef = dbAdmin.collection("matches");
      const snapshot = await matchesRef.get();
      currentMatches = snapshot.docs.map(doc => doc.data());
      // Sort in memory by ID
      currentMatches.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    } catch (e) {
      console.error("Firestore fetch failed:", e);
      
      const isPermissionDenied = e instanceof Error && e.message.includes("PERMISSION_DENIED");
      const isNotFound = e instanceof Error && e.message.includes("NOT_FOUND");
      
      // Fallback to default database if permission denied or not found on configured one
      if ((isPermissionDenied || isNotFound) && !isUsingFallbackDb && firebaseConfig.firestoreDatabaseId) {
        console.warn(`Firestore ${isNotFound ? 'database not found' : 'permission denied'} for configured database, attempting fallback to default database...`);
        try {
          const dbDefault = getFirestore(admin.apps[0]);
          const snapshot = await dbDefault.collection("matches").get();
          currentMatches = snapshot.docs.map(doc => doc.data());
          currentMatches.sort((a, b) => parseInt(a.id) - parseInt(b.id));
          dbAdmin = dbDefault; // Switch for future calls
          isUsingFallbackDb = true;
          console.log("Successfully switched to default Firestore database.");
        } catch (e2) {
          console.error("Fallback to default database also failed:", e2);
          currentMatches = [...MOCK_MATCHES];
        }
      } else {
        currentMatches = [...MOCK_MATCHES];
      }
    }

    if (currentMatches.length === 0) {
      currentMatches = [...MOCK_MATCHES];
    }

    // 2. Try to scrape live data
    try {
      const [intlMatches, leagueMatches] = await Promise.all([
        fetchMatches("live-scores", "international"),
        fetchMatches("live-scores", "league")
      ]);
      
      const allScraped = [...intlMatches, ...leagueMatches].map(m => ({
        id: m.id,
        team1: m.team1 || "TBD",
        team2: m.team2 || "TBD",
        status: m.status,
        score: m.score,
        result: m.overview
      }));
      
      // 3. Merge scraped data and PERSIST completed matches
      const batch = dbAdmin ? dbAdmin.batch() : null;
      let hasUpdates = false;

      if (!batch) {
        console.warn("Cannot persist updates: Firestore not initialized.");
      }

      allScraped.forEach(scraped => {
        // Find matching match in our database
        // Match by teams if ID doesn't match (Cricbuzz IDs change)
        const matchInDb = currentMatches.find(m => 
          m.id === scraped.id || 
          (m.team1 === scraped.team1 && m.team2 === scraped.team2) ||
          (m.team1 === scraped.team2 && m.team2 === scraped.team1)
        );

        if (matchInDb) {
          // Update the match in our list
          matchInDb.status = scraped.status;
          matchInDb.score = scraped.score;
          matchInDb.result = scraped.result;
          
          // If match is completed, persist to Firestore
          if (scraped.status === "completed" && batch && dbAdmin) {
            const docRef = dbAdmin.collection("matches").doc(matchInDb.id);
            batch.update(docRef, {
              status: "completed",
              score: scraped.score,
              result: scraped.result
            });
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates && batch) {
        await batch.commit();
        console.log("Persisted completed matches to Firestore.");
      }
    } catch (scrapeError) {
      console.error("Scraping process failed:", scrapeError);
    }

    // Update cache
    cachedMatches = [...currentMatches];
    lastFetchTime = Date.now();
    
    const finalMatches = currentMatches.map(m => ({
      ...m,
      status: m.status || "upcoming"
    }));
    res.json(finalMatches);
  } catch (error: any) {
    console.error("API Error in /api/matches:", error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: error?.message || String(error),
      fallback: MOCK_MATCHES 
    });
  }
});

app.get("/api/players/:matchId", async (req, res) => {
  const { matchId } = req.params;
  try {
    // Try to fetch real squads from Cricbuzz
    const realPlayers = await fetchSquads(matchId);
    if (realPlayers.length > 0) {
      return res.json(realPlayers);
    }

    // Fallback to mock data for demo matches
    const match = MOCK_MATCHES.find(m => m.id === matchId);
    let team1 = "LSG";
    let team2 = "DC";

    if (match) {
      team1 = match.team1;
      team2 = match.team2;
    } else {
      if (matchId === "2422") { team1 = "RCB"; team2 = "MI"; }
      if (matchId === "2423") { team1 = "CSK"; team2 = "GT"; }
    }

    const p1 = TEAM_PLAYERS[team1] || TEAM_PLAYERS["LSG"];
    const p2 = TEAM_PLAYERS[team2] || TEAM_PLAYERS["DC"];

    res.json([...p1, ...p2]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

app.get("/api/live/:matchId", async (req, res) => {
  const { matchId } = req.params;
  try {
    try {
      const scoreData = await fetchScore(matchId);
      return res.json({
        score: scoreData.liveScore || "0/0 (0.0)",
        status: scoreData.update.toLowerCase().includes("won") ? "completed" : "live",
        toss: scoreData.update,
        result: scoreData.update,
        currentBatter: `${scoreData.batsmanOne} ${scoreData.batsmanOneRun}${scoreData.batsmanOneBall}`,
        currentBowler: `${scoreData.bowlerOne} ${scoreData.bowlerOneOver}-${scoreData.bowlerOneRun}-${scoreData.bowlerOneWickets}`
      });
    } catch (e) {
      const match = MOCK_MATCHES.find(m => m.id === matchId);
      if (match && match.status === "completed") {
        return res.json({
          score: match.score || "0/0 (0.0)",
          status: "completed",
          toss: match.result || "Match Ended",
          result: match.result || "Match Ended",
          currentBatter: "Match Ended",
          currentBowler: "Match Ended"
        });
      }
      if (match && match.status === "live") {
        return res.json({
          score: match.score || "0/0 (0.0)",
          status: "live",
          toss: match.result || "Match in Progress",
          result: match.result || "Match in Progress",
          currentBatter: "Playing",
          currentBowler: "Bowling"
        });
      }
    }

    res.json({
      score: "0/0 (0.0)",
      status: "upcoming",
      toss: "Toss at 7:00 PM IST",
      currentBatter: "-",
      currentBowler: "-"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live update" });
  }
});

async function startServer() {
  console.log("Starting server in", process.env.NODE_ENV || "development", "mode...");
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware initialized.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log("Serving static files from:", distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
