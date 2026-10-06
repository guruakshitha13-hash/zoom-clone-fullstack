import Navbar from "@/components/Navbar";
import ScheduleForm from "@/components/ScheduleForm";

export const metadata = { title: "Schedule Meeting — ZoomClone" };

export default function SchedulePage() {
  return (
    <>
      <Navbar />
      <ScheduleForm />
    </>
  );
}
