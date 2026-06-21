/**
 * RCCG Great Joy Parish — Seed Data
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
 *  or: npx prisma db seed
 *
 * Creates: 8 departments, 3 house fellowships, 25 members,
 *          8 system users (one per role), income configs,
 *          60+ transactions (3 months), attendance sessions,
 *          and 2 monthly returns.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const d    = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("🌱  Seeding RCCG Great Joy Parish…\n");

  // ── 0. Wipe existing seed data cleanly ─────────────────────────────────────
  await prisma.attendance.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.monthlyReturn.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.member.deleteMany();
  await prisma.houseFellowship.deleteMany();
  await prisma.department.deleteMany();
  await prisma.incomeConfig.deleteMany();
  console.log("✓  Old data cleared");

  // ── 1. Departments ──────────────────────────────────────────────────────────
  const deptData = [
    { name: "Choir",                    description: "Worship and music ministry",            budget: 80000  },
    { name: "Ushering",                 description: "Order and hospitality ministry",         budget: 30000  },
    { name: "Protocol",                 description: "Pastoral protocol and coordination",     budget: 25000  },
    { name: "Youth Fellowship",         description: "Youth ministry (ages 18–35)",            budget: 60000  },
    { name: "Women's Fellowship",       description: "Women's ministry and welfare",           budget: 50000  },
    { name: "Men's Fellowship",         description: "Men's ministry and evangelism",          budget: 45000  },
    { name: "Children/Sunday School",   description: "Children's church and Sunday school",   budget: 35000  },
    { name: "Media & Communications",   description: "Audio, visual and social media",         budget: 70000  },
  ];

  const depts: Record<string, string> = {};
  for (const d of deptData) {
    const dept = await prisma.department.create({ data: d });
    depts[d.name] = dept.id;
  }
  console.log(`✓  ${deptData.length} departments created`);

  // ── 2. House Fellowships ────────────────────────────────────────────────────
  const hfData = [
    { name: "Favour HF",       address: "12 Rumuola Road, Port Harcourt",   zone: "Zone A", meetingDay: "Thursday", meetingTime: "17:00" },
    { name: "Glory HF",        address: "45 Ada George Road, Port Harcourt", zone: "Zone B", meetingDay: "Wednesday", meetingTime: "17:30" },
    { name: "Dominion HF",     address: "8 Woji Road, Port Harcourt",        zone: "Zone C", meetingDay: "Friday",    meetingTime: "18:00" },
  ];

  const hfs: Record<string, string> = {};
  for (const h of hfData) {
    const hf = await prisma.houseFellowship.create({ data: h });
    hfs[h.name] = hf.id;
  }
  console.log(`✓  ${hfData.length} house fellowships created`);

  // ── 3. Members ──────────────────────────────────────────────────────────────
  const memberData = [
    // Pastors & Leaders
    { firstName:"Emmanuel", lastName:"Adeyemi",   phone:"08031234001", gender:"MALE",   dob:d(1972,3,15), workerStatus:"PASTOR",           dept:"Protocol",               hf:"Favour HF",  baptism:"BAPTISED", foundationSchool:true,  joined:d(2015,1,1)  },
    { firstName:"Grace",    lastName:"Adeyemi",   phone:"08031234002", gender:"FEMALE", dob:d(1975,7,22), workerStatus:"WORKER",            dept:"Women's Fellowship",     hf:"Favour HF",  baptism:"BAPTISED", foundationSchool:true,  joined:d(2015,1,1)  },
    { firstName:"Solomon",  lastName:"Okafor",    phone:"08031234003", gender:"MALE",   dob:d(1980,5,10), workerStatus:"DEPARTMENT_HEAD",   dept:"Choir",                  hf:"Glory HF",   baptism:"BAPTISED", foundationSchool:true,  joined:d(2016,3,1)  },
    { firstName:"Blessing", lastName:"Eze",       phone:"08031234004", gender:"FEMALE", dob:d(1985,11,3), workerStatus:"DEPARTMENT_HEAD",   dept:"Women's Fellowship",     hf:"Glory HF",   baptism:"BAPTISED", foundationSchool:true,  joined:d(2016,6,1)  },
    { firstName:"Chukwudi", lastName:"Nwosu",     phone:"08031234005", gender:"MALE",   dob:d(1978,2,28), workerStatus:"DEPARTMENT_HEAD",   dept:"Men's Fellowship",       hf:"Dominion HF",baptism:"BAPTISED", foundationSchool:true,  joined:d(2017,1,1)  },
    // Workers
    { firstName:"Ngozi",    lastName:"Obi",       phone:"08031234006", gender:"FEMALE", dob:d(1990,8,14), workerStatus:"WORKER",            dept:"Ushering",               hf:"Favour HF",  baptism:"BAPTISED", foundationSchool:true,  joined:d(2018,4,1)  },
    { firstName:"Tunde",    lastName:"Adeleke",   phone:"08031234007", gender:"MALE",   dob:d(1988,12,5), workerStatus:"WORKER",            dept:"Media & Communications", hf:"Glory HF",   baptism:"BAPTISED", foundationSchool:true,  joined:d(2018,7,1)  },
    { firstName:"Amaka",    lastName:"Onyeka",    phone:"08031234008", gender:"FEMALE", dob:d(1992,4,19), workerStatus:"WORKER",            dept:"Choir",                  hf:"Glory HF",   baptism:"BAPTISED", foundationSchool:true,  joined:d(2019,1,1)  },
    { firstName:"Ifeanyi",  lastName:"Chukwu",    phone:"08031234009", gender:"MALE",   dob:d(1986,9,30), workerStatus:"WORKER",            dept:"Protocol",               hf:"Dominion HF",baptism:"BAPTISED", foundationSchool:true,  joined:d(2019,3,1)  },
    { firstName:"Patience", lastName:"Udoh",      phone:"08031234010", gender:"FEMALE", dob:d(1983,6,12), workerStatus:"WORKER",            dept:"Children/Sunday School", hf:"Favour HF",  baptism:"BAPTISED", foundationSchool:true,  joined:d(2019,6,1)  },
    { firstName:"Emeka",    lastName:"Obiora",    phone:"08031234011", gender:"MALE",   dob:d(1991,1,25), workerStatus:"WORKER_IN_TRAINING",dept:"Youth Fellowship",        hf:"Glory HF",   baptism:"BAPTISED", foundationSchool:false, joined:d(2020,1,1)  },
    { firstName:"Chisom",   lastName:"Eze",       phone:"08031234012", gender:"FEMALE", dob:d(1995,7,8),  workerStatus:"WORKER_IN_TRAINING",dept:"Choir",                  hf:"Dominion HF",baptism:"BAPTISED", foundationSchool:false, joined:d(2020,5,1)  },
    // Regular Members
    { firstName:"Kelechi",  lastName:"Nwachukwu", phone:"08031234013", gender:"MALE",   dob:d(1993,3,17), workerStatus:"NONE",              dept:null,                     hf:"Favour HF",  baptism:"BAPTISED", foundationSchool:false, joined:d(2021,1,1)  },
    { firstName:"Adaeze",   lastName:"Okonkwo",   phone:"08031234014", gender:"FEMALE", dob:d(1997,10,2), workerStatus:"NONE",              dept:null,                     hf:"Glory HF",   baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2021,6,1) },
    { firstName:"Obinna",   lastName:"Nwosu",     phone:"08031234015", gender:"MALE",   dob:d(1989,5,21), workerStatus:"NONE",              dept:null,                     hf:"Dominion HF",baptism:"BAPTISED", foundationSchool:false, joined:d(2022,1,1)  },
    { firstName:"Chinwe",   lastName:"Okafor",    phone:"08031234016", gender:"FEMALE", dob:d(1994,12,9), workerStatus:"NONE",              dept:null,                     hf:"Favour HF",  baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2022,3,1) },
    { firstName:"Uche",     lastName:"Ibe",       phone:"08031234017", gender:"MALE",   dob:d(1987,8,3),  workerStatus:"NONE",              dept:null,                     hf:"Glory HF",   baptism:"BAPTISED", foundationSchool:false, joined:d(2022,8,1)  },
    { firstName:"Ifeoma",   lastName:"Ogbonna",   phone:"08031234018", gender:"FEMALE", dob:d(1996,2,14), workerStatus:"NONE",              dept:null,                     hf:"Dominion HF",baptism:"BAPTISED", foundationSchool:false, joined:d(2023,1,1)  },
    { firstName:"David",    lastName:"Akpan",     phone:"08031234019", gender:"MALE",   dob:d(1990,11,28),workerStatus:"NONE",              dept:null,                     hf:"Favour HF",  baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2023,4,1) },
    { firstName:"Esther",   lastName:"Bassey",    phone:"08031234020", gender:"FEMALE", dob:d(1998,6,5),  workerStatus:"NONE",              dept:null,                     hf:"Glory HF",   baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2023,9,1) },
    { firstName:"Samuel",   lastName:"Obot",      phone:"08031234021", gender:"MALE",   dob:d(2000,4,11), workerStatus:"NONE",              dept:null,                     hf:"Dominion HF",baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2024,1,1) },
    { firstName:"Joy",      lastName:"Effiong",   phone:"08031234022", gender:"FEMALE", dob:d(2001,9,23), workerStatus:"NONE",              dept:null,                     hf:"Favour HF",  baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2024,5,1) },
    // New converts
    { firstName:"Michael",  lastName:"Udo",       phone:"08031234023", gender:"MALE",   dob:d(2003,1,7),  workerStatus:"NONE",              dept:null,                     hf:null,         baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2026,3,1), isNewConvert:true, convertDate:d(2026,3,12) },
    { firstName:"Favour",   lastName:"Etim",      phone:"08031234024", gender:"FEMALE", dob:d(2002,7,30), workerStatus:"NONE",              dept:null,                     hf:null,         baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2026,4,1), isNewConvert:true, convertDate:d(2026,4,6) },
    { firstName:"Daniel",   lastName:"Osung",     phone:"08031234025", gender:"MALE",   dob:d(1999,12,15),workerStatus:"NONE",              dept:null,                     hf:null,         baptism:"NOT_BAPTISED", foundationSchool:false, joined:d(2026,5,1), isNewConvert:true, convertDate:d(2026,5,4), isFirstTimer:true },
  ];

  const memberIds: Record<string, string> = {};
  let count = 1;
  for (const m of memberData) {
    const memberId = `GJP-2024-${String(count).padStart(4,"0")}`;
    const member = await prisma.member.create({
      data: {
        memberId,
        firstName:          m.firstName,
        lastName:           m.lastName,
        phone:              m.phone,
        email:              `${m.firstName.toLowerCase()}.${m.lastName.toLowerCase()}@mail.com`,
        gender:             m.gender as any,
        dateOfBirth:        m.dob,
        workerStatus:       m.workerStatus as any,
        baptismStatus:      m.baptism as any,
        foundationSchool:   m.foundationSchool,
        isNewConvert:       (m as any).isNewConvert ?? false,
        isFirstTimer:       (m as any).isFirstTimer ?? false,
        convertDate:        (m as any).convertDate ?? undefined,
        joinedDate:         m.joined,
        status:             "ACTIVE",
        province:           "Rivers Province 12",
        zone:               pick(["Zone A","Zone B","Zone C"]),
        departmentId:       m.dept ? depts[m.dept] : undefined,
        houseFellowshipId:  m.hf   ? hfs[m.hf]    : undefined,
      },
    });
    memberIds[`${m.firstName} ${m.lastName}`] = member.id;
    count++;
  }
  console.log(`✓  ${memberData.length} members created`);

  // ── 4. System users ──────────────────────────────────────────────────────────
  // Password for all test accounts: Parish@2026
  const pw = hash("Parish@2026");

  const usersData = [
    { email:"superadmin@greatjoy.org",  role:"SUPER_ADMIN", name:"Emmanuel Adeyemi"  },
    { email:"pastor@greatjoy.org",      role:"PASTOR",      name:"Emmanuel Adeyemi"  },
    { email:"treasurer@greatjoy.org",   role:"TREASURER",   name:"Chukwudi Nwosu"    },
    { email:"secretary@greatjoy.org",   role:"SECRETARY",   name:"Blessing Eze"      },
    { email:"hod@greatjoy.org",         role:"HOD",         name:"Solomon Okafor"    },
    { email:"auditor@greatjoy.org",     role:"AUDITOR",     name:"Ngozi Obi"         },
    { email:"worker@greatjoy.org",      role:"WORKER",      name:"Tunde Adeleke"     },
    { email:"member@greatjoy.org",      role:"MEMBER",      name:"Kelechi Nwachukwu" },
  ];

  for (const u of usersData) {
    await prisma.user.create({
      data: {
        email:        u.email,
        passwordHash: pw,
        role:         u.role as any,
        isActive:     true,
        member:       memberIds[u.name] ? { connect: { id: memberIds[u.name] } } : undefined,
      },
    });
  }
  console.log(`✓  ${usersData.length} system users created (password: Parish@2026)`);

  // ── 5. Income config (RCCG Rivers Province 12 official remittance %) ───────
  // Derived from the physical Financial Report form (see remittance-rules.ts
  // for the full multi-tier waterfall used on the printed return).
  const configs = [
    { category:"TITHE",                       remittancePct:64,  parishRetainPct:36,  description:"64% National / 36% Parish" },
    { category:"MINISTERS_TITHE",             remittancePct:64,  parishRetainPct:36,  description:"64% National / 36% Parish" },
    { category:"SUNDAY_LOVE_OFFERING",        remittancePct:35,  parishRetainPct:65,  description:"10% National + 25% Provincial" },
    { category:"THANKSGIVING",                remittancePct:81,  parishRetainPct:19,  description:"70% National + 1% PSF + 5% Provincial + 5% Area" },
    { category:"CRM",                         remittancePct:75,  parishRetainPct:25,  description:"50% National + 25% Provincial" },
    { category:"CHILDREN_TEENS_OFFERING",     remittancePct:0,   parishRetainPct:100, description:"Retained by parish" },
    { category:"TRUST_FRUIT",                 remittancePct:90,  parishRetainPct:10,  description:"90% National (First Fruit)" },
    { category:"FIRST_BORN_REDEMPTION",       remittancePct:100, parishRetainPct:0,   description:"Full remittance to National" },
    { category:"GOSPEL_FUND",                 remittancePct:25,  parishRetainPct:75,  description:"25% National" },
    { category:"HOUSE_FELLOWSHIP_OFFERING",   remittancePct:0,   parishRetainPct:100, description:"Retained by parish" },
    { category:"BUILDING_FUND",               remittancePct:0,   parishRetainPct:100, description:"Retained by parish" },
    { category:"WELFARE",                     remittancePct:0,   parishRetainPct:100, description:"Retained by parish" },
    { category:"SPECIAL_DONATION",            remittancePct:0,   parishRetainPct:100, description:"Retained by parish" },
    { category:"PARTNERSHIP_SEED",            remittancePct:50,  parishRetainPct:50,  description:"50% to Province" },
    { category:"CONVENTION_LEVY",             remittancePct:100, parishRetainPct:0,   description:"Full remittance to HQ" },
    { category:"RUN",                         remittancePct:100, parishRetainPct:0,   description:"Full remittance to RUN" },
    { category:"CSR",                         remittancePct:100, parishRetainPct:0,   description:"100% Provincial" },
    { category:"OTHER_INCOME",                remittancePct:0,   parishRetainPct:100, description:"Retained by parish" },
    // Rivers Province 12 official Financial Report — additional categories
    { category:"HOLY_GHOST_CONGRESS",         remittancePct:100, parishRetainPct:0,   description:"Viewing Centre — full remittance" },
    { category:"AFRICAN_MISSION_OFFERING",    remittancePct:100, parishRetainPct:0,   description:"100% Provincial" },
    { category:"CAMP_CLEARING",               remittancePct:100, parishRetainPct:0,   description:"100% Provincial" },
    { category:"SUNDAY_SCHOOL_OFFERING",      remittancePct:70,  parishRetainPct:30,  description:"70% Provincial" },
    { category:"JUNIOR_FELLOWSHIP",           remittancePct:35,  parishRetainPct:65,  description:"35% Provincial" },
    { category:"HOME_FELLOWSHIP",             remittancePct:30,  parishRetainPct:70,  description:"30% Provincial" },
    { category:"GOOD_WOMEN_OFFERING",         remittancePct:70,  parishRetainPct:30,  description:"70% Provincial" },
    { category:"RCCG_AUDITORIUM_CONTRIBUTION",remittancePct:100, parishRetainPct:0,   description:"100% Provincial" },
    { category:"CSR_EDUCATION",               remittancePct:100, parishRetainPct:0,   description:"100% Provincial" },
    { category:"CONVENTION_CONGRESS_SUPPORT", remittancePct:100, parishRetainPct:0,   description:"100% Provincial" },
    { category:"PASTORS_WELFARE_PURSE",       remittancePct:100, parishRetainPct:0,   description:"100% Provincial" },
    { category:"DAY_OUT_CARD",                remittancePct:100, parishRetainPct:0,   description:"100% Provincial" },
    { category:"VICTORY_SERVICE",             remittancePct:50,  parishRetainPct:50,  description:"50% Provincial / 50% Parish" },
    { category:"SEED_FAITH_HOLY_COMMUNION",   remittancePct:0,   parishRetainPct:100, description:"Retained by parish" },
    { category:"ZONE_LETS_GO_AFISHING",       remittancePct:100, parishRetainPct:0,   description:"100% Zone" },
  ];

  for (const c of configs) {
    await prisma.incomeConfig.upsert({
      where:  { category: c.category as any },
      update: { remittancePct: c.remittancePct },
      create: { category: c.category as any, remittancePct: c.remittancePct, parishRetainPct: c.parishRetainPct, description: c.description },
    });
  }
  console.log(`✓  ${configs.length} income configs set`);

  // ── 6. Transactions (April, May, June 2026) ─────────────────────────────────
  const txData = [
    // ─ April 2026 ─
    { type:"INCOME",  cat:"TITHE",                    amt:285000, pm:"BANK_TRANSFER", date:d(2026,4,6),  desc:"Sunday tithes — 6 April"          },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:145000, pm:"CASH",          date:d(2026,4,6),  desc:"Sunday offering — 6 April"         },
    { type:"INCOME",  cat:"TITHE",                    amt:310000, pm:"BANK_TRANSFER", date:d(2026,4,13), desc:"Sunday tithes — 13 April"         },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:162000, pm:"CASH",          date:d(2026,4,13), desc:"Sunday offering — 13 April"        },
    { type:"INCOME",  cat:"THANKSGIVING",             amt:95000,  pm:"CASH",          date:d(2026,4,13), desc:"Thanksgiving offering"             },
    { type:"INCOME",  cat:"TITHE",                    amt:298000, pm:"BANK_TRANSFER", date:d(2026,4,20), desc:"Sunday tithes — 20 April"         },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:138000, pm:"CASH",          date:d(2026,4,20), desc:"Sunday offering — 20 April"        },
    { type:"INCOME",  cat:"TITHE",                    amt:275000, pm:"BANK_TRANSFER", date:d(2026,4,27), desc:"Sunday tithes — 27 April"         },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:128000, pm:"CASH",          date:d(2026,4,27), desc:"Sunday offering — 27 April"        },
    { type:"INCOME",  cat:"CRM",                      amt:85000,  pm:"CASH",          date:d(2026,4,27), desc:"CRM offering — April"             },
    { type:"INCOME",  cat:"BUILDING_FUND",            amt:150000, pm:"BANK_TRANSFER", date:d(2026,4,30), desc:"Building fund contributions"       },
    { type:"INCOME",  cat:"HOUSE_FELLOWSHIP_OFFERING",amt:62000,  pm:"CASH",          date:d(2026,4,30), desc:"HF offerings — April"             },
    { type:"INCOME",  cat:"CHILDREN_TEENS_OFFERING",  amt:28000,  pm:"CASH",          date:d(2026,4,27), desc:"Children's church offering"        },
    { type:"INCOME",  cat:"MINISTERS_TITHE",          amt:45000,  pm:"BANK_TRANSFER", date:d(2026,4,30), desc:"Ministers' tithe — April"         },
    { type:"INCOME",  cat:"WELFARE",                  amt:35000,  pm:"CASH",          date:d(2026,4,13), desc:"Welfare contributions"             },
    { type:"EXPENSE", cat:"FUEL",                     amt:25000,  pm:"CASH",          date:d(2026,4,8),  desc:"Generator fuel — April week 1"    },
    { type:"EXPENSE", cat:"FUEL",                     amt:22000,  pm:"CASH",          date:d(2026,4,22), desc:"Generator fuel — April week 3"    },
    { type:"EXPENSE", cat:"WELFARE_PAYMENT",          amt:40000,  pm:"BANK_TRANSFER", date:d(2026,4,15), desc:"Welfare to 4 families"             },
    { type:"EXPENSE", cat:"INTERNET",                 amt:15000,  pm:"BANK_TRANSFER", date:d(2026,4,5),  desc:"Broadband subscription — April"   },
    { type:"EXPENSE", cat:"PRINTING",                 amt:8500,   pm:"CASH",          date:d(2026,4,10), desc:"Bulletins and tracts"              },
    { type:"EXPENSE", cat:"STATIONERY",               amt:4500,   pm:"CASH",          date:d(2026,4,10), desc:"Office supplies"                   },
    { type:"EXPENSE", cat:"REFRESHMENT",              amt:18000,  pm:"CASH",          date:d(2026,4,13), desc:"Communion and workers' meeting"    },
    { type:"EXPENSE", cat:"MAINTENANCE",              amt:35000,  pm:"CASH",          date:d(2026,4,20), desc:"Sound system repair"               },
    // ─ May 2026 ─
    { type:"INCOME",  cat:"TITHE",                    amt:320000, pm:"BANK_TRANSFER", date:d(2026,5,4),  desc:"Sunday tithes — 4 May"            },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:155000, pm:"CASH",          date:d(2026,5,4),  desc:"Sunday offering — 4 May"          },
    { type:"INCOME",  cat:"TITHE",                    amt:345000, pm:"BANK_TRANSFER", date:d(2026,5,11), desc:"Sunday tithes — 11 May"           },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:170000, pm:"CASH",          date:d(2026,5,11), desc:"Sunday offering — 11 May"         },
    { type:"INCOME",  cat:"THANKSGIVING",             amt:110000, pm:"CASH",          date:d(2026,5,11), desc:"Thanksgiving offering"             },
    { type:"INCOME",  cat:"TITHE",                    amt:312000, pm:"BANK_TRANSFER", date:d(2026,5,18), desc:"Sunday tithes — 18 May"           },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:148000, pm:"CASH",          date:d(2026,5,18), desc:"Sunday offering — 18 May"         },
    { type:"INCOME",  cat:"TITHE",                    amt:298000, pm:"BANK_TRANSFER", date:d(2026,5,25), desc:"Sunday tithes — 25 May"           },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:142000, pm:"CASH",          date:d(2026,5,25), desc:"Sunday offering — 25 May"         },
    { type:"INCOME",  cat:"CRM",                      amt:92000,  pm:"CASH",          date:d(2026,5,25), desc:"CRM offering — May"               },
    { type:"INCOME",  cat:"BUILDING_FUND",            amt:180000, pm:"BANK_TRANSFER", date:d(2026,5,31), desc:"Building fund contributions"       },
    { type:"INCOME",  cat:"HOUSE_FELLOWSHIP_OFFERING",amt:71000,  pm:"CASH",          date:d(2026,5,31), desc:"HF offerings — May"               },
    { type:"INCOME",  cat:"CHILDREN_TEENS_OFFERING",  amt:32000,  pm:"CASH",          date:d(2026,5,25), desc:"Children's church offering"        },
    { type:"INCOME",  cat:"MINISTERS_TITHE",          amt:48000,  pm:"BANK_TRANSFER", date:d(2026,5,31), desc:"Ministers' tithe — May"           },
    { type:"INCOME",  cat:"CONVENTION_LEVY",          amt:125000, pm:"BANK_TRANSFER", date:d(2026,5,20), desc:"Convention levy — members"         },
    { type:"EXPENSE", cat:"FUEL",                     amt:26000,  pm:"CASH",          date:d(2026,5,6),  desc:"Generator fuel — May week 1"      },
    { type:"EXPENSE", cat:"FUEL",                     amt:24000,  pm:"CASH",          date:d(2026,5,20), desc:"Generator fuel — May week 3"      },
    { type:"EXPENSE", cat:"WELFARE_PAYMENT",          amt:45000,  pm:"BANK_TRANSFER", date:d(2026,5,12), desc:"Welfare to 5 families"             },
    { type:"EXPENSE", cat:"INTERNET",                 amt:15000,  pm:"BANK_TRANSFER", date:d(2026,5,5),  desc:"Broadband subscription — May"     },
    { type:"EXPENSE", cat:"SALARY_STIPEND",           amt:80000,  pm:"BANK_TRANSFER", date:d(2026,5,30), desc:"Pastoral aide stipend"             },
    { type:"EXPENSE", cat:"DECORATION",               amt:22000,  pm:"CASH",          date:d(2026,5,18), desc:"Church decoration — Mothers Day"  },
    // ─ June 2026 ─
    { type:"INCOME",  cat:"TITHE",                    amt:335000, pm:"BANK_TRANSFER", date:d(2026,6,1),  desc:"Sunday tithes — 1 June"           },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:160000, pm:"CASH",          date:d(2026,6,1),  desc:"Sunday offering — 1 June"         },
    { type:"INCOME",  cat:"TITHE",                    amt:360000, pm:"BANK_TRANSFER", date:d(2026,6,8),  desc:"Sunday tithes — 8 June"           },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:175000, pm:"CASH",          date:d(2026,6,8),  desc:"Sunday offering — 8 June"         },
    { type:"INCOME",  cat:"THANKSGIVING",             amt:98000,  pm:"CASH",          date:d(2026,6,8),  desc:"Thanksgiving offering"             },
    { type:"INCOME",  cat:"TITHE",                    amt:295000, pm:"BANK_TRANSFER", date:d(2026,6,15), desc:"Sunday tithes — 15 June"          },
    { type:"INCOME",  cat:"SUNDAY_LOVE_OFFERING",     amt:152000, pm:"CASH",          date:d(2026,6,15), desc:"Sunday offering — 15 June"        },
    { type:"INCOME",  cat:"BUILDING_FUND",            amt:200000, pm:"BANK_TRANSFER", date:d(2026,6,15), desc:"Building fund — June"             },
    { type:"INCOME",  cat:"WELFARE",                  amt:42000,  pm:"CASH",          date:d(2026,6,8),  desc:"Welfare contributions"             },
    { type:"EXPENSE", cat:"FUEL",                     amt:27000,  pm:"CASH",          date:d(2026,6,3),  desc:"Generator fuel — June week 1"     },
    { type:"EXPENSE", cat:"INTERNET",                 amt:15000,  pm:"BANK_TRANSFER", date:d(2026,6,2),  desc:"Broadband subscription — June"    },
    { type:"EXPENSE", cat:"TRANSPORTATION",           amt:12000,  pm:"CASH",          date:d(2026,6,10), desc:"Evangelical outreach transport"    },
    { type:"EXPENSE", cat:"PRINTING",                 amt:9500,   pm:"CASH",          date:d(2026,6,8),  desc:"Programs and tracts"               },
  ];

  let txCount = 1;
  for (const t of txData) {
    const prefix = t.type === "INCOME" ? "INC" : "EXP";
    const ref    = `${prefix}-2026-${String(txCount).padStart(5,"0")}`;
    let remittanceAmount: number | undefined;
    if (t.type === "INCOME") {
      const cfg = configs.find(c => c.category === t.cat);
      if (cfg && cfg.remittancePct > 0) remittanceAmount = (t.amt * cfg.remittancePct) / 100;
    }
    await prisma.transaction.create({
      data: {
        reference:       ref,
        type:            t.type as any,
        incomeCategory:  t.type === "INCOME"  ? t.cat as any : undefined,
        expenseCategory: t.type === "EXPENSE" ? t.cat as any : undefined,
        amount:          t.amt,
        description:     t.desc,
        paymentMethod:   t.pm as any,
        transactionDate: t.date,
        remittanceAmount,
        isRemitted:      false,
      },
    });
    txCount++;
  }
  console.log(`✓  ${txData.length} transactions created (April–June 2026)`);

  // ── 7. Attendance sessions ───────────────────────────────────────────────────
  const memberList = Object.values(memberIds);

  const sessions = [
    // April
    { date:d(2026,4,2),  type:"DIGGING_DEEP",    men:18, women:28, children:0  },
    { date:d(2026,4,6),  type:"SUNDAY_MORNING",  men:45, women:72, children:31 },
    { date:d(2026,4,9),  type:"DIGGING_DEEP",    men:22, women:32, children:0  },
    { date:d(2026,4,11), type:"FAITH_CLINIC",    men:15, women:25, children:0  },
    { date:d(2026,4,13), type:"SUNDAY_MORNING",  men:50, women:80, children:36 },
    { date:d(2026,4,18), type:"YOUTH_SERVICE",   men:28, women:30, children:0  },
    { date:d(2026,4,20), type:"SUNDAY_MORNING",  men:48, women:75, children:34 },
    { date:d(2026,4,27), type:"SUNDAY_MORNING",  men:52, women:82, children:38 },
    // May
    { date:d(2026,5,4),  type:"SUNDAY_MORNING",  men:55, women:85, children:40 },
    { date:d(2026,5,7),  type:"DIGGING_DEEP",    men:20, women:30, children:0  },
    { date:d(2026,5,9),  type:"FAITH_CLINIC",    men:18, women:28, children:0  },
    { date:d(2026,5,11), type:"SUNDAY_MORNING",  men:58, women:88, children:42 },
    { date:d(2026,5,16), type:"YOUTH_SERVICE",   men:32, women:35, children:0  },
    { date:d(2026,5,18), type:"SUNDAY_MORNING",  men:52, women:79, children:37 },
    { date:d(2026,5,25), type:"SUNDAY_MORNING",  men:49, women:76, children:35 },
    // June
    { date:d(2026,6,1),  type:"SUNDAY_MORNING",  men:56, women:87, children:41 },
    { date:d(2026,6,4),  type:"DIGGING_DEEP",    men:21, women:31, children:0  },
    { date:d(2026,6,6),  type:"FAITH_CLINIC",    men:16, women:26, children:0  },
    { date:d(2026,6,8),  type:"SUNDAY_MORNING",  men:60, women:92, children:44 },
    { date:d(2026,6,13), type:"YOUTH_SERVICE",   men:30, women:33, children:0  },
    { date:d(2026,6,15), type:"SUNDAY_MORNING",  men:54, women:83, children:39 },
  ];

  for (const s of sessions) {
    const total = s.men + s.women + s.children;
    const session = await prisma.attendanceSession.create({
      data: {
        serviceDate:   s.date,
        serviceType:   s.type as any,
        menCount:      s.men,
        womenCount:    s.women,
        childrenCount: s.children,
        totalCount:    total,
        preacher:      s.type === "SUNDAY_MORNING" ? "Pastor Emmanuel Adeyemi" : undefined,
      },
    });
    // Mark a random subset of actual members as present
    const attendees = memberList.sort(() => Math.random() - 0.5).slice(0, rand(8, 20));
    await prisma.attendance.createMany({
      data: attendees.map(mId => ({ sessionId: session.id, memberId: mId, present: true })),
    });
  }
  console.log(`✓  ${sessions.length} attendance sessions + member records created`);

  // ── 8. Monthly returns ───────────────────────────────────────────────────────
  // April 2026 — SUBMITTED
  await prisma.monthlyReturn.create({
    data: {
      month:  4, year: 2026,
      status: "SUBMITTED",
      submittedAt: d(2026,5,3),
      totalTithe:          1168000,
      totalMinistersTithe: 45000,
      totalSundayOffering: 573000,
      totalThanksgiving:   95000,
      totalCRM:            85000,
      totalChildrenOffering:28000,
      totalHFOffering:     62000,
      totalBuildingFund:   150000,
      totalExpenses:       168500,
      totalRemittance:     682500,
    },
  });

  // May 2026 — DRAFT (generated but not yet submitted)
  await prisma.monthlyReturn.create({
    data: {
      month:  5, year: 2026,
      status: "DRAFT",
      totalTithe:          1275000,
      totalMinistersTithe: 48000,
      totalSundayOffering: 615000,
      totalThanksgiving:   110000,
      totalCRM:            92000,
      totalChildrenOffering:32000,
      totalHFOffering:     71000,
      totalBuildingFund:   180000,
      totalExpenses:       212000,
      totalRemittance:     748750,
    },
  });
  console.log("✓  2 monthly returns created (April=SUBMITTED, May=DRAFT)");

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════╗
║       SEED COMPLETE — Great Joy Parish               ║
╠══════════════════════════════════════════════════════╣
║  Login at your Vercel URL with any of these:         ║
║                                                      ║
║  superadmin@greatjoy.org  →  SUPER_ADMIN             ║
║  pastor@greatjoy.org      →  PASTOR                  ║
║  treasurer@greatjoy.org   →  TREASURER               ║
║  secretary@greatjoy.org   →  SECRETARY               ║
║  hod@greatjoy.org         →  HOD                     ║
║  auditor@greatjoy.org     →  AUDITOR                 ║
║  worker@greatjoy.org      →  WORKER                  ║
║  member@greatjoy.org      →  MEMBER                  ║
║                                                      ║
║  Password (all accounts): Parish@2026                ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch(e => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
