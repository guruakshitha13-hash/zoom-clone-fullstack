import Navbar from "@/components/Navbar";
import JoinFlow from "@/components/JoinFlow";

export const metadata = { title: "Join Meeting — ZoomClone" };

export default function InviteJoinPage({ params }) {
  return (
    <>
      <Navbar />
      <JoinFlow initialId={params.meetingId} />
    </>
  );
}
