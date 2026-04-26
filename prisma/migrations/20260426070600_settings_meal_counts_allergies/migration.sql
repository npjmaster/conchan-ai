ALTER TABLE "user_settings" ADD COLUMN "breakfast_main_dish_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user_settings" ADD COLUMN "breakfast_side_dish_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user_settings" ADD COLUMN "lunch_main_dish_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user_settings" ADD COLUMN "lunch_side_dish_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user_settings" ADD COLUMN "dinner_main_dish_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user_settings" ADD COLUMN "dinner_side_dish_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "user_settings" ADD COLUMN "allergies" TEXT NOT NULL DEFAULT '';
