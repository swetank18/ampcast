import { Suspense } from "react";
import Samanvay from "@/components/samanvay/Samanvay";
import "./samanvay.css";

export const metadata = {
  title: "Samanvay — tariff-native demand control for a residential society",
  description:
    "Sixty flats, one shared connection, one bill written against the single highest fifteen minutes of the month. The burst being managed in real time, and the saving proved against the schedule the society used before.",
};

/* The build spec's tweakable props are read from the query string:
 *   ?mode=NOW|TIMELINE|COMPARE|EVIDENCE
 *   &scenario=normal|heatwave|sensor_drop|grid_outage|festival
 *   &alert=safe|watch|danger
 *   &view=3d|2d
 * useSearchParams needs a Suspense boundary on a statically rendered route. */
export default function SamanvayPage() {
  return (
    <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#F6F5F3" }} />}>
      <Samanvay />
    </Suspense>
  );
}
