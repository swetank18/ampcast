import Resident from "@/components/resident/Resident";
import "./resident.css";

export const metadata = {
  title: "Samanvay — your flat",
  description:
    "The resident side of Samanvay. What was moved in your home today, what it saved, what the society can see about your flat, and what you can ask for. Everything essential works no matter what you choose.",
};

export default function ResidentPage() {
  return <Resident />;
}
