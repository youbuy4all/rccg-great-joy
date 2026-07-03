-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PASTOR', 'TREASURER', 'HOD', 'SECRETARY', 'AUDITOR', 'WORKER', 'MEMBER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'VISITOR', 'NEW_CONVERT', 'TRANSFERRED_IN', 'TRANSFERRED_OUT');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('NONE', 'WORKER_IN_TRAINING', 'WORKER', 'MINISTER', 'DEPARTMENT_HEAD', 'PASTOR');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('ADULT', 'YOUTH', 'TEENAGER', 'CHILD', 'TODDLER');

-- CreateEnum
CREATE TYPE "BaptismStatus" AS ENUM ('NOT_BAPTISED', 'BAPTISED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('SUNDAY_MORNING', 'SUNDAY_EVENING', 'TUESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'DIGGING_DEEP', 'FAITH_CLINIC', 'YOUTH_SERVICE', 'CHILDREN_SERVICE', 'HOUSE_FELLOWSHIP', 'SPECIAL_SERVICE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('TITHE', 'MINISTERS_TITHE', 'SUNDAY_LOVE_OFFERING', 'THANKSGIVING', 'CRM', 'CHILDREN_TEENS_OFFERING', 'TRUST_FRUIT', 'FIRST_BORN_REDEMPTION', 'GOSPEL_FUND', 'HOUSE_FELLOWSHIP_OFFERING', 'BUILDING_FUND', 'WELFARE', 'SPECIAL_DONATION', 'PARTNERSHIP_SEED', 'CONVENTION_LEVY', 'RUN', 'CSR', 'OTHER_INCOME', 'HOLY_GHOST_CONGRESS', 'AFRICAN_MISSION_OFFERING', 'CAMP_CLEARING', 'SUNDAY_SCHOOL_OFFERING', 'JUNIOR_FELLOWSHIP', 'HOME_FELLOWSHIP', 'GOOD_WOMEN_OFFERING', 'RCCG_AUDITORIUM_CONTRIBUTION', 'CSR_EDUCATION', 'CONVENTION_CONGRESS_SUPPORT', 'PASTORS_WELFARE_PURSE', 'DAY_OUT_CARD', 'VICTORY_SERVICE', 'SEED_FAITH_HOLY_COMMUNION', 'ZONE_LETS_GO_AFISHING', 'CHURCH_PROJECT');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FUEL', 'WELFARE_PAYMENT', 'RENT', 'SOUND_EQUIPMENT', 'SALARY_STIPEND', 'MEDIA', 'DECORATION', 'TRANSPORTATION', 'INTERNET', 'MAINTENANCE', 'PRINTING', 'STATIONERY', 'REFRESHMENT', 'TITHE_REMITTANCE', 'OTHER_EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'POS', 'CHEQUE', 'ONLINE');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'QUERIED');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'SMS', 'IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "other_names" TEXT,
    "phone" TEXT NOT NULL,
    "phone_2" TEXT,
    "email" TEXT,
    "gender" "Gender" NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "wedding_anniversary" TIMESTAMP(3),
    "profile_photo" TEXT,
    "address" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "workerStatus" "WorkerStatus" NOT NULL DEFAULT 'NONE',
    "baptismStatus" "BaptismStatus" NOT NULL DEFAULT 'NOT_BAPTISED',
    "baptism_date" TIMESTAMP(3),
    "foundation_school" BOOLEAN NOT NULL DEFAULT false,
    "foundation_school_date" TIMESTAMP(3),
    "is_first_timer" BOOLEAN NOT NULL DEFAULT false,
    "is_new_convert" BOOLEAN NOT NULL DEFAULT false,
    "convert_date" TIMESTAMP(3),
    "age_group" "AgeGroup" NOT NULL DEFAULT 'ADULT',
    "zone" TEXT,
    "area" TEXT,
    "province" TEXT DEFAULT 'Rivers Province 12',
    "house_fellowship_id" TEXT,
    "department_id" TEXT,
    "joined_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "house_fellowships" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "zone" TEXT,
    "leader_id" TEXT,
    "meeting_day" TEXT,
    "meeting_time" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "house_fellowships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hod_id" TEXT,
    "budget" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "service_date" DATE NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "preacher" TEXT,
    "men_count" INTEGER NOT NULL DEFAULT 0,
    "women_count" INTEGER NOT NULL DEFAULT 0,
    "children_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "sunday_school_count" INTEGER NOT NULL DEFAULT 0,
    "house_fellowship_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "marked_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "income_category" "IncomeCategory",
    "expense_category" "ExpenseCategory",
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "transaction_date" DATE NOT NULL,
    "member_id" TEXT,
    "department_id" TEXT,
    "debit_account_id" TEXT,
    "credit_account_id" TEXT,
    "return_id" TEXT,
    "is_remitted" BOOLEAN NOT NULL DEFAULT false,
    "remitted_at" TIMESTAMP(3),
    "remittance_amount" DECIMAL(15,2),
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_configs" (
    "id" TEXT NOT NULL,
    "category" "IncomeCategory" NOT NULL,
    "parish_retain_pct" DECIMAL(5,2) NOT NULL,
    "remittance_pct" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_returns" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "submitted_by_id" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "total_tithe" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_ministers_tithe" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_sunday_offering" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_thanksgiving" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_crm" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_children_offering" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_trust_fruit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_first_born" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_gospel_fund" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_hf_offering" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_building_fund" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_run" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_csr" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_expenses" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_remittance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "avg_sunday_attendance" INTEGER NOT NULL DEFAULT 0,
    "avg_midweek_attendance" INTEGER NOT NULL DEFAULT 0,
    "avg_faith_clinic" INTEGER NOT NULL DEFAULT 0,
    "avg_youth_service" INTEGER NOT NULL DEFAULT 0,
    "avg_house_fellowship" INTEGER NOT NULL DEFAULT 0,
    "new_converts" INTEGER NOT NULL DEFAULT 0,
    "water_baptism" INTEGER NOT NULL DEFAULT 0,
    "workers_in_training" INTEGER NOT NULL DEFAULT 0,
    "foundation_school" INTEGER NOT NULL DEFAULT 0,
    "total_active_members" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "number_of_births" INTEGER NOT NULL DEFAULT 0,
    "number_of_deaths" INTEGER NOT NULL DEFAULT 0,
    "number_of_marriages" INTEGER NOT NULL DEFAULT 0,
    "newly_baptised_workers" INTEGER NOT NULL DEFAULT 0,
    "avg_vigil_attendance" INTEGER NOT NULL DEFAULT 0,
    "avg_special_programme_attendance" INTEGER NOT NULL DEFAULT 0,
    "number_of_baptised_workers" INTEGER NOT NULL DEFAULT 0,
    "number_of_new_workers" INTEGER NOT NULL DEFAULT 0,
    "number_of_deacons" INTEGER NOT NULL DEFAULT 0,
    "number_of_assistant_pastors" INTEGER NOT NULL DEFAULT 0,
    "number_of_full_pastors" INTEGER NOT NULL DEFAULT 0,
    "number_of_unordained_ministers" INTEGER NOT NULL DEFAULT 0,
    "area_requiring_praise" TEXT,
    "area_requiring_prayer" TEXT,
    "general_well_being" TEXT,
    "other_remarks" TEXT,

    CONSTRAINT "monthly_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "target_group" TEXT NOT NULL,
    "sent_by_id" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_recipients" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMP(3),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "message_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_id_key" ON "members"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_phone_key" ON "members"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hod_id_key" ON "departments"("hod_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_service_date_service_type_key" ON "attendance_sessions"("service_date", "service_type");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_session_id_member_id_key" ON "attendance"("session_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "income_configs_category_key" ON "income_configs"("category");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_returns_month_year_key" ON "monthly_returns"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "message_recipients_message_id_member_id_key" ON "message_recipients"("message_id", "member_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_house_fellowship_id_fkey" FOREIGN KEY ("house_fellowship_id") REFERENCES "house_fellowships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hod_id_fkey" FOREIGN KEY ("hod_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debit_account_id_fkey" FOREIGN KEY ("debit_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "monthly_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_returns" ADD CONSTRAINT "monthly_returns_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

