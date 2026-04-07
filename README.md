# 🍽️ Mess Management System

A full-stack web application for managing group meal tracking, finances, and bazar scheduling — built for shared living arrangements like student messes, hostels, and shared apartments.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 7 | Build tool & dev server |
| Tailwind CSS v4 | Utility-first styling |
| DaisyUI v5 | Component library |
| React Router v7 | Client-side routing |
| Axios | HTTP requests |
| Firebase (Client) | Authentication |
| Recharts | Financial analytics charts |
| Lottie React | Animated loaders |
| SweetAlert2 | Confirmation dialogs |
| date-fns | Date formatting & utilities |
| React Icons | Icon library |
| Framer Motion | Animations |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database & ODM |
| Firebase Admin SDK | Token verification |
| PDFKit | PDF report generation |
| Vercel | Serverless deployment |

---

## ⏱️ Project Duration

**~3–4 weeks** of active development, including iterative UI improvements, bug fixes, and feature additions.

---

## 📋 Description

Mess Management System is a collaborative platform designed to simplify the day-to-day financial and meal management of a shared living group. Members can track their daily meals, managers can record bazar costs and deposits, and everyone gets a transparent view of their financial standing at any time.

The app supports multiple groups, role-based access (manager vs member), dark/light theme, and generates downloadable PDF reports.

---

## ✨ Key Features

- **Group Management** — Create or join a group with a unique code. Manager can transfer role, deactivate/reactivate members.
- **Meal Sheet** — Daily meal tracking (breakfast, lunch, dinner) with guest meal support. Manager edits, all members view.
- **Finance Summary** — Real-time calculation of meal rate, per-member cost, deposit, and balance. Tabbed deposit & bazar history with sticky header/footer scroll.
- **Bazar Schedule** — Manager assigns date ranges to members for bazar duty. All members can view and download as PDF.
- **My History** — Personal monthly history with charts showing meal trends, deposit vs cost, and balance over time.
- **PDF Reports** — Manager can download a full monthly report (finance summary, member breakdown, bazar history).
- **Dark / Light Theme** — Persistent theme toggle across the app.
- **Responsive Design** — Fully optimized for mobile, tablet, and desktop.
- **Authentication** — Firebase-based email/password auth with protected routes.

---

## 🚧 Challenges Faced

One of the trickiest parts was handling guest meal counts alongside own meals — getting the calculation right on both frontend and backend without off-by-one errors took several iterations. Another significant challenge was implementing sticky table headers and footers with a scrollable body, since native CSS `sticky` breaks inside `overflow` containers. The solution was splitting the table into three separate tables (header, scrollable body, footer) with synchronized `colgroup` widths to keep columns aligned.

Real-time group state management was also tricky — after a user left a group, the app wasn't redirecting without a page reload because the context still held the old `groupId`. This was fixed by immediately refreshing `userData` from the server after the leave API call. PDF generation had locale inconsistency issues where `toLocaleDateString()` produced different date formats across server environments, which was resolved with a custom UTC-based formatter. Finally, making the dashboard tabs work on very small screens without wrapping required a custom `xs` breakpoint and a vertical icon+text layout.

---

## 🔮 Future Improvements

The most impactful next step would be adding push notifications so members get alerted on their bazar duty day or when a new deposit is recorded. Meal preferences or opt-out options would also make the system more flexible for members who skip certain meals. Beyond meals, the platform could be extended to handle shared utility bills, rent, and other group expenses.

On the scheduling side, multi-month bazar planning without manual month switching would improve the manager experience significantly. A super-admin dashboard for overseeing multiple groups, an automated month rollover system that archives old data and resets for the new month, and eventually a React Native mobile app are all natural next steps for making this a more complete product.
