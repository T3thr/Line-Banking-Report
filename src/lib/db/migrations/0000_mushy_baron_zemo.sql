CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"account_name" varchar(100) NOT NULL,
	"bank_name" varchar(50) NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"raw_message" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
