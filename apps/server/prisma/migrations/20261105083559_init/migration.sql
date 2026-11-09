-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "passportNumber" VARCHAR(20) NOT NULL,
    "birthDate" DATE NOT NULL,
    "workPhone" VARCHAR(30) NOT NULL,
    "photo" VARCHAR(255),
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "photo" VARCHAR(255),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "works" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "workDate" DATE NOT NULL,
    "hoursWorked" DECIMAL(4,2) NOT NULL,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_passportNumber_key" ON "employees"("passportNumber");

-- CreateIndex
CREATE INDEX "employees_categoryId_idx" ON "employees"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE INDEX "works_employeeId_idx" ON "works"("employeeId");

-- CreateIndex
CREATE INDEX "works_companyId_idx" ON "works"("companyId");

-- CreateIndex
CREATE INDEX "works_workDate_idx" ON "works"("workDate");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
