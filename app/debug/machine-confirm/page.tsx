import MachineConfirmBar from "@/app/components/MachineConfirmBar";

export default function Page() {
  // using a real pair you already shared
  const companyId = "00012597-465e-479b-aaaa-3367cecdf9db";
  const machineId = "09a11283-78a2-4ed5-9bce-84ea9870ec8a";

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Machine Confirm Test</h1>

      <div className="rounded-xl border p-4">
        <div className="mb-2 text-sm text-gray-700">
          Agor — SHAFT-36mm (example row)
        </div>
        {/* Force-show the buttons for testing by passing status="probable".
           Clicking Confirm will still hit the real API and (re)confirm the link. */}
        <MachineConfirmBar
          companyId={companyId}
          machineId={machineId}
          status="probable"
          confidence={0.72}
        />
      </div>
    </div>
  );
}
