import MeetingRoom from "@/components/MeetingRoom";

export const metadata = { title: "Meeting — ZoomClone" };

export default function MeetingPage({ params }) {
  return <MeetingRoom meetingId={params.meetingId} />;
}
