import express from "express";
import path from "path";
import * as cheerio from "cheerio";
import axios from "axios";

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
    const response = await axios.get(`${CRICBUZZ_URL}/live-cricket-scores/${matchId}`, { timeout: 5000 });
    const $ = cheerio.load(response.data);

    const update = $('.cb-col.cb-col-100.cb-min-stts.cb-text-complete').text().trim() || 'Match Stats will Update Soon';
    const process = $('.cb-text-inprogress').text().trim() || 'Match Stats will Update Soon';
    const noresult = $('.cb-col.cb-col-100.cb-font-18.cb-toss-sts.cb-text-abandon').text().trim() || 'Match Stats will Update Soon';
    const stumps = $('.cb-text-stumps').text().trim() || 'Match Stats will Update Soon';
    const lunch = $('.cb-text-lunch').text().trim() || 'Match Stats will Update Soon';
    const inningsbreak = $('.cb-text-inningsbreak').text().trim() || 'Match Stats will Update Soon';
    const tea = $('.cb-text-tea').text().trim() || 'Match Stats will Update Soon';
    const rain_break = $('.cb-text-rain').text().trim() || 'Match Stats will Update Soon';
    const wet_outfield = $('.cb-text-wetoutfield').text().trim() || 'Match Stats will Update Soon';

    return {
      'title': $('.cb-nav-hdr.cb-font-18.line-ht24').text().trim().replace(', Commentary', ''),
      'update': update !== 'Match Stats will Update Soon' ? update : process || noresult || stumps || lunch || inningsbreak || tea || rain_break || wet_outfield || 'Match Stats will Update Soon...',
      'liveScore': $('.cb-font-20.text-bold').text().trim(),
      'runRate': $('.cb-font-12.cb-text-gray').first().text().trim().replace('CRR:\u00a0', ''),
      'batsmanOne': $('.cb-col.cb-col-50').eq(1).text().trim(),
      'batsmanOneRun': $('.cb-col.cb-col-10.ab.text-right').eq(0).text().trim(),
      'batsmanOneBall': '(' + $('.cb-col.cb-col-10.ab.text-right').eq(1).text().trim() + ')',
      'batsmanOneSR': $('.cb-col.cb-col-14.ab.text-right').eq(0).text().trim(),
      'batsmanTwo': $('.cb-col.cb-col-50').eq(2).text().trim(),
      'batsmanTwoRun': $('.cb-col.cb-col-10.ab.text-right').eq(2).text().trim(),
      'batsmanTwoBall': '(' + $('.cb-col.cb-col-10.ab.text-right').eq(3).text().trim() + ')',
      'batsmanTwoSR': $('.cb-col.cb-col-14.ab.text-right').eq(1).text().trim(),
      'bowlerOne': $('.cb-col.cb-col-50').eq(4).text().trim(),
      'bowlerOneOver': $('.cb-col.cb-col-10.text-right').eq(4).text().trim(),
      'bowlerOneRun': $('.cb-col.cb-col-10.text-right').eq(5).text().trim(),
      'bowlerOneWickets': $('.cb-col.cb-col-8.text-right').eq(5).text().trim(),
      'bowlerOneEconomy': $('.cb-col.cb-col-14.text-right').eq(2).text().trim(),
      'bowlerTwo': $('.cb-col.cb-col-50').eq(5).text().trim(),
      'bowlerTwoOver': $('.cb-col.cb-col-10.text-right').eq(6).text().trim(),
      'bowlerTwoRun': $('.cb-col.cb-col-10.text-right').eq(7).text().trim(),
      'bowlerTwoWicket': $('.cb-col.cb-col-8.text-right').eq(7).text().trim(),
      'bowlerTwoEconomy': $('.cb-col.cb-col-14.text-right').eq(3).text().trim(),
    };
  } catch (e) {
    throw new Error("Something went wrong");
  }
};

const fetchSquads = async (matchId: string) => {
  try {
    const response = await axios.get(`${CRICBUZZ_URL}/cricket-match-squads/${matchId}`, { timeout: 5000 });
    const $ = cheerio.load(response.data);
    const players: any[] = [];

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
    const response = await axios.get(URL, { timeout: 5000 });
    const $ = cheerio.load(response.data);

    const matches: any[] = [];

    // Cricbuzz structure for live scores
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
        teams,
        timeAndPlace: {
          date,
          time,
          place,
        },
        overview: overViewIfLive || overViewIfComplete || overViewIfUpcoming,
        status: overViewIfLive ? "live" : (overViewIfComplete ? "completed" : "upcoming")
      };

      if (matchId && title.length) {
        if (!matches.find(match => match.id === matchId)) {
          matches.push(matchObject);
        }
      }
    });

    return matches;
  } catch (error: any) {
    console.error(`Scraping ${endpoint} failed:`, error.message);
    return [];
  }
};

// API Routes
app.get("/api/matches", async (req, res) => {
  try {
    let matches: any[] = [];
    try {
      // Try both international and league tabs
      const [intlMatches, leagueMatches] = await Promise.all([
        fetchMatches("live-scores", "international"),
        fetchMatches("live-scores", "league")
      ]);
      
      const allScraped = [...intlMatches, ...leagueMatches];
      
      // Filter for matches that look like IPL or are in the League tab
      // We also include some mock matches if no real IPL matches are found to ensure the app is usable
      matches = allScraped.map(m => {
        // Try to parse a real date if possible
        let startTime = new Date().toISOString();
        if (m.timeAndPlace?.date) {
          try {
            // Cricbuzz date format: "Wed, Apr 01 2026"
            const dateStr = `${m.timeAndPlace.date} ${m.timeAndPlace.time || '19:30'}`;
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              startTime = parsedDate.toISOString();
            }
          } catch (e) {}
        }

        return {
          id: m.id,
          team1: m.teams[0]?.team || "TBD",
          team2: m.teams[1]?.team || "TBD",
          startTime,
          status: m.status,
          score: m.teams.map((t: any) => `${t.team} ${t.run}`).join(" vs "),
          result: m.overview
        };
      });

      // If no matches found, add some mock ones for IPL 2026 demo
      if (matches.length === 0) {
        matches = [
          { 
            id: "2421", 
            team1: "CSK", 
            team2: "RCB", 
            startTime: "2026-03-22T14:30:00Z", 
            status: "completed", 
            score: "173/6 (20.0) vs 176/4 (18.4)",
            result: "Chennai Super Kings won by 6 wickets"
          },
          { 
            id: "2422", 
            team1: "MI", 
            team2: "GT", 
            startTime: "2026-04-01T14:30:00Z", 
            status: "live",
            score: "168/6 (20.0) vs 120/4 (15.2)",
            result: "Gujarat Titans need 49 runs in 28 balls"
          },
          { id: "2423", team1: "LSG", team2: "RR", startTime: "2026-04-02T10:00:00Z", status: "upcoming" },
          { id: "2424", team1: "DC", team2: "PBKS", startTime: "2026-04-02T14:30:00Z", status: "upcoming" },
          { id: "2425", team1: "KKR", team2: "SRH", startTime: "2026-04-03T14:30:00Z", status: "upcoming" }
        ];
      }
    } catch (e) {
      console.warn("Scraping failed:", e);
    }

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
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
    let team1 = "LSG";
    let team2 = "DC";

    if (matchId === "2422") { team1 = "RCB"; team2 = "MI"; }
    if (matchId === "2423") { team1 = "CSK"; team2 = "GT"; }

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
      if (matchId === "2421") {
        return res.json({
          score: "141 (18.4) vs 145/4 (17.1)",
          status: "completed",
          toss: "Delhi Capitals won the toss and chose to bowl",
          result: "Delhi Capitals won by 6 wickets",
          currentBatter: "Match Ended",
          currentBowler: "Match Ended"
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

if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  async function startDevServer() {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startDevServer();
}

export default app;
