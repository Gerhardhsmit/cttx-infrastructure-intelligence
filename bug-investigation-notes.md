# Audit Form Bug Investigation Notes

## Reported Issue

The reported issue is that the first section of `/audit/new`, described as the area that says "Tell us about your organization and property," is "not working."

## Browser Findings

On the `/audit/new` page, the first audit step renders as expected with the title **Client & Reserve Information** and the helper text **Tell us about your organization and property**.

The **Client / Reserve Name** text input accepts typed text. A browser interaction test successfully entered `Kwandwe Private Game Reserve`, and the text was visible against the dark input background.

The **Sector** dropdown opens successfully. A browser interaction test displayed all expected sector options: `Game Reserve`, `Farm`, `Mining`, `Renewable Energy`, `Logistics`, and `Other`.

No immediate evidence was found that the first step is functionally broken at the input or dropdown interaction level. The remaining likely issue is the **Next** button behavior, mobile/viewport sizing, unclear affordance, or insufficient validation feedback when required fields are missing.

## Additional Browser Verification

The **Game Reserve** sector option can be selected successfully, and the selected value appears in the dropdown trigger.

After entering a client/reserve name and selecting a sector, the **Next** button advances the form from **Step 1 of 5** to **Step 2 of 5**. Therefore, the first step's core controls are technically functional in the tested desktop viewport.

## Working Diagnosis

Because the typed field, dropdown, and step advancement all work in direct testing, the reported issue is likely caused by **UX ambiguity rather than a hard JavaScript failure**. The first section asks for organization and property information but exposes only one combined text field labeled `Client / Reserve Name`. A user expecting separate organization and property fields may reasonably experience this as "not working" or incomplete. The small, low-contrast section copy and required-field feedback may also make the first step feel unclear.

## Verification after fix

The updated `/audit/new` first step now displays the section as **Organization & Property Information** with clearer helper copy. Clicking **Next** with empty required fields keeps the user on Step 1 and shows inline error messages for both the organization/property name and operating sector fields. Entering `Kwandwe Private Game Reserve` into the organization/property field works, selecting `Game Reserve` from the operating-sector dropdown works, and clicking **Next** advances the form to **Step 2 of 5: Location & Size**.

Automated checks completed successfully: `pnpm check` passed and `pnpm test` passed with 3 test files and 12 tests.

## Location-first intelligence upgrade verification — 2026-05-09

The upgraded audit form opens successfully and retains the clear **Organization / Property Name** and **Operating Sector** controls. After entering `Kwandwe Private Game Reserve` and selecting `Game Reserve`, the form advances to Step 2.

Step 2 is now titled **Location Pin & Infrastructure Discovery** and includes a visible map, a **Capture property pin** action, property latitude/longitude fields, property size, and an **Infrastructure discovery pins** area. The first infrastructure point defaults to **Candidate backhaul handoff** with a point type selector, **Pin** action, delete action, and notes area, directly addressing the need to map potential wireless handoff or landing points.

Automated TypeScript and Vitest checks passed after the implementation.

## Location-first intelligence report verification — 2026-05-09

The deterministic capture controls were verified end-to-end after the latest fixes. The property pin button immediately captured map-center coordinates, the infrastructure point pin created a candidate handoff coordinate, and the operational-zone **Set pin** button displayed coordinates for the selected main lodge zone.

A full preliminary report was generated for `Kwandwe Private Game Reserve` with meaningful first-pass intelligence rather than zero-only placeholders. The generated report showed a **Connectivity Intelligence Score of 72/100**, **Terrain Complexity Index of 68/100**, and **Load-Shedding Survival Dial of 62%**. The report also displayed mapped infrastructure discovery entries and engineering notes explaining that the score is a preliminary estimate based on the property pin, discovery pins, operating sector, site size, connectivity context, and known problems.

## Reserve-manager report output verification — 2026-05-09

Opened `/audit/90001` after the report-output update and verified that the report now includes **What the Reserve Manager Receives**, explaining that the audit gives the property a first-pass connectivity pathway and that CTTX can use captured property and infrastructure pins to validate where connectivity can enter and which operational zones should be prioritised.

Verified that the report includes **Recommended next decision**, instructing the user to request a CTTX engineering discovery call to confirm the practical connection path, priority zones, and whether desktop validation, field survey, or proposal scoping is appropriate.

Verified that the report includes **Who Contacts Whom?**, clearly stating that CTTX reviews the submitted audit, contacts the submitted email, and validates backhaul availability, line-of-sight, coverage zones, power resilience, installation access, and commercial feasibility before issuing a final recommendation.

Verified that the report includes practical **Reserve Manager Recommendations** and **Prepare for the CTTX Discovery Call** sections. The CTA now says **Request CTTX Follow-up** and **Request Follow-up and Report** rather than implying a passive download-only action.
