-- Out of office counts as a working day, not as vacation.

ALTER TYPE "LeaveType" ADD VALUE 'OUT_OF_OFFICE';
