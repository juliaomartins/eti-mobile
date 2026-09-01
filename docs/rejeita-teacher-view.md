# A rejected day, as the teacher sees it

What appears in the app when an administrator refuses the evidence behind one of
the teacher's days, and what the teacher can do about it.

**Contract:** `docs/api-contract.md` §6 (copied from `eti-api`; that repo is the
source). Where this file and the contract disagree, the contract is right.

Tetun strings below are **copied verbatim from the components**. Do not reword
them here — if the UI text changes, copy the new text across.

---

## What happened, from the teacher's side

The teacher punched normally: photo, GPS, inside the school. Later an
administrator looked at that day in the dashboard and judged the evidence
unacceptable — a fake photo, or a punch too far from the school — and refused
it.

Nothing notifies the teacher. **The day simply changes** the next time Istoria
is opened.

The app never initiates this and has no endpoint for it. Rejection is
admin-only; the mobile app is a **reader** of the result.

---

## Where it shows

Only in **Istoria** (the monthly sheet), on the day card:
`components/IstoriaDayCard.tsx`.

The fields arrive on each day of `GET /api/prezensa/istoria/`, typed in
`lib/istoria.ts` as `LoronRecord`.

### The badge

```ts
const rejeitadu = !!day.rejeita_motivu;
```

That single check drives everything. When true:

- the badge takes `ISTORIA_COLORS.rejeitadu` instead of the green a present day
  would get — a rejected day arrives as `ABSENT` with **Falta** in
  `status_display`, and without this the badge would paint it like a day that
  went perfectly;
- the badge text is `day.status_display ?? "Falta"`.

### The panel

Beneath the punch rows:

> **Prezensa rejeita—{rejeita_motivu_display}**
> {rejeita_obs}
> Husi {rejeita_husi_naran}

Each of the last two lines renders only when its field is non-empty.

`rejeita_motivu_display` is the Tetun label — **Foto falsu**, **Distánsia dook
liu husi eskola**, or **Hotu-hotu**. Never show `rejeita_motivu` itself; the
stored value is English and is API contract, not user text.

### The punches stay visible

The evidence rows remain on the card. The teacher can still see the photo and
time of each punch that was refused — which is the point: a teacher told they
were marked absent should be able to see what was judged.

---

## ⚠️ The slot does **not** become punchable again

This is the part most likely to be assumed wrong.

**A rejected day cannot be re-punched.** The punch rows survive a rejection by
design — they are the evidence the decision rests on, and this app never deletes
one. Because the punch still exists:

- `bele_checkin` / `bele_checkout` for that session stay **false**, since the
  server computes them from whether a punch exists;
- `lib/marka-flow.ts` obeys those two booleans exactly as the API reports them,
  so the buttons stay closed on their own — no client-side special case is
  needed, and none should be added;
- a punch sent anyway is refused with **`duplicate`**.

There is **no soft-invalidation flag** on a punch. `Marka` has twelve fields and
none of them records a rejection.

So the honest answer to "what can the teacher do about it": **nothing in the
app.** They talk to the administration, and an administrator undoes it from the
dashboard with **Hasai rejeita**, which returns the day to `PRESENT`.

> **OPEN QUESTION.** The feature is sometimes described as "the slot reopens so
> the teacher can punch again", with the punch soft-invalidated. The code does
> neither. Recorded in `eti-api/docs/api-contract.md` §6 and as known issue 18
> in `eti-api/docs/plan.md`. **Do not build a re-punch affordance on this until
> it is resolved** — today it would fail with `duplicate`.

---

## If it is ever resolved in favour of re-punching

Nothing else about punching changes, so the existing rules would still apply in
full. Recorded here so it is not re-derived later:

- **A photo is still required.** `foto` is mandatory on the punch endpoints;
  there is no path that records a punch without one.
- **The geofence still applies.** While `ESKOLA_OBRIGA_FATIN` is on, a punch
  further than `ESKOLA_RAIU_METRU` from the school is refused with
  `dook_husi_eskola`, and the response carries `distansia` in metres.
- **The session rules still apply.** Saturday has no afternoon (`no_session`),
  Sunday is not a working day, and a check out with no check in is refused
  (`no_checkin`).
- **The server sets the time**, not the device.

---

## The fields

On every day of `istoria`, not only rejected ones. All optional in
`LoronRecord`, because an older server omits them entirely.

| Field | Type | When not rejected |
|---|---|---|
| `rejeita_motivu` | `string \| null` | `""` |
| `rejeita_motivu_display` | `string \| null` — the Tetun label | `null` |
| `rejeita_obs` | `string \| null` | `""` |
| `rejeita_husi_naran` | `string \| null` | `null` |

> **Renamed 2026-09-01** — was `rejeisaun_motivu`, `rejeisaun_obs`,
> `rejeisaun_motivu_display`. A hard cutover: the old keys are no longer sent,
> so a build older than this reads `undefined` and shows the day as an
> unexplained **Falta**. It does not crash — every field is optional and every
> read is guarded — but the teacher is told nothing about why.
