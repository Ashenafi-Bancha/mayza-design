# Mayza Admin: how to use it

The admin is at `/admin` on the website. It works on a phone and on a computer, in English and Amharic (the EN / አማ switch at the top).

## Signing in

- Each person has their own account. The owner adds staff under **Staff**.
- **Two-step sign-in** is optional but recommended, especially for the owner. Turn it on in **Settings**: scan the QR code with Google Authenticator, Microsoft Authenticator or Authy, then type the 6-digit code. After that, every sign-in asks for the password and then the code from the phone. It can be turned off again in Settings with your password.
- Too many wrong passwords or codes lock that connection out for 15 minutes.
- Lost your phone? The owner can reset two-step sign-in for a staff member under **Staff**. If the owner loses theirs, the developer resets it.

## Roles

| Role | Can see and do |
|------|----------------|
| Owner | Everything, including staff accounts, website settings and the activity log |
| Manager | Inbox, orders, clients, payments, calendar. No staff, settings or activity log |
| Content editor | Products, collections, photos and website text. Never sees clients or orders |
| Tailor | Only the orders in production that are assigned to them. They can move an order between *In production* and *Ready*, add notes and progress photos. No prices or client phone numbers |

The server checks the role on every action, so hiding a button is never the only protection.

## Dashboard

- **Today**: orders due today and events happening today.
- **New inquiries**, **Overdue** and **Due in the next 7 days**.
- **Upcoming events**: weddings and other occasions with a date.
- Money (owner and manager): paid this week and this month, and what is still to collect.
- Website numbers: visitors this week, where they came from (Instagram, Google, Telegram, direct…), the most viewed collections and inquiries per collection. The website counts visits without cookies and without storing anyone's address.
- Quick actions: + New order, New client, Add collection, Add photo, Post news.

## Inbox

Every inquiry and order is here, whether it came from the website order sheet or was added by staff.

- Search by client name, phone number (any format: 0911…, +251911…) or order number.
- **Filters**: status, source, type, priority, assigned staff, deadline, dates, archived.
- **List** or **Board** view. On the board, drag a card to another column to change its status (on a phone, use the status menu on the card).
- Change a status straight from the list with the coloured status menu.
- After a status change the admin offers a ready-made message for the client by WhatsApp, Telegram or SMS. Nothing is sent unless you tap it.

The pipeline: New → Contacted → Quote sent → Confirmed → In production → Ready → Delivered, or Cancelled.

## Adding an order by hand (+ New order)

For phone calls, walk-ins, Telegram, WhatsApp and Instagram messages.

1. **Client**: type a name or phone number to find an existing client, or tap **New client**. If the phone number already belongs to someone, the admin warns you and offers to use that client.
2. **The order**: where it came from, the type (custom, ready-to-wear, alteration, event styling), a catalog piece if there is one, what the client wants, fabric and colour, the occasion and event date, and reference photos (several at once).
3. **Measurements** in cm: tap a saved set to fill them in, or type new ones. Tick *Save these measurements to the client's profile* to keep them for next time. **Add a measurement** adds any extra one.
4. **Deadline and team**: due date (highlighted when it is within 7 days), priority (Normal, Urgent, VIP), assigned staff and internal notes.
5. **Price and payments**: the quoted price and any payments already received (Telebirr, bank, cash), with the date and a note. The balance and payment status (Unpaid, Deposit paid, Paid) update as you type.
6. Start the order as **New** or **Confirmed**, then **Save order**, or **Save and add another** to keep going.

Each order gets a number like `ORD-2026-0001`. It appears at once in the inbox, on the client's profile, on the board and in the calendar, and the timeline records "Created by (name) via phone call".

## The order page

- The pipeline bar, and a status menu with an optional note.
- Details, measurements, reference photos and progress photos (tailors can take a progress photo with the phone camera).
- **Timeline**: every change, note, payment and photo, with who did it and when. Add notes for the team here.
- Client card with Call, WhatsApp and Telegram buttons.
- Assigned staff, payments (record a new payment or remove a wrong one).
- **Print order sheet** for the workshop, **Edit order**, **Duplicate order**, **Archive**. Only the owner can delete an order for good.

## Clients

Search clients, open a profile to see all their orders, total paid, saved measurements and private notes. Mark VIP clients (opening a VIP profile is recorded in the activity log). Start a new order for a client from their profile.

## Calendar

A month view of due dates and event dates. Bookings and fittings join it in a later phase.

## Website, products and collections

These work as before: edit products and collections with photos, show or hide them, and change the text and photos of each page under **Website**. The owner sets phone numbers, address, social links and the announcement bar under **Settings**.

## Activity log (owner)

Who signed in, created or changed orders, recorded payments, edited the website or changed staff, with the time. Search it or filter by person.
