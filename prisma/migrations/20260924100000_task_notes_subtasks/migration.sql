-- AlterTable
ALTER TABLE "Task" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "TaskTimeEntry" ADD COLUMN "note" TEXT;
ALTER TABLE "TaskTimeEntry" ADD COLUMN "subtaskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TaskTimeEntry_subtaskId_key" ON "TaskTimeEntry"("subtaskId");

-- AddForeignKey
ALTER TABLE "TaskTimeEntry" ADD CONSTRAINT "TaskTimeEntry_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
