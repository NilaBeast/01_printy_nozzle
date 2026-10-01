import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../public/css/policy.css";

const FAQ_GROUPS = [
  {
    title: "Company",
    items: [
      {
        q: "What is Printynozzle?",
        a: "Printynozzle is an electronics components store and custom 3D printing service based in Sodepur, North 24 Parganas, West Bengal. We sell microcontrollers, sensors, modules, tools and filaments, and manufacture made-to-order 3D prints from your STL files.",
      },
      {
        q: "How can I contact support?",
        a: "Email info.printynozzle@gmail.com or call 9836609063 (Mon – Sat, 10 AM – 7 PM). You can also use the Contact page form — we usually reply within a few hours.",
      },
      {
        q: "Where are you located?",
        a: "145 Indira Nagar Block 3, Panihati, Sodepur, Opposite Shree Krishna Sweets, North 24 Parganas, 700110, West Bengal, India.",
      },
    ],
  },
  {
    title: "Orders & Payments",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "UPI, credit/debit cards, net banking and wallets via Razorpay, direct QR/UPI transfer with screenshot verification, and Cash on Delivery on eligible pincodes.",
      },
      {
        q: "How does Pay with QR work?",
        a: "Choose Pay with QR at checkout, scan the code showing your exact order total, pay from any UPI app, attach the payment screenshot and place the order. Our team verifies the screenshot and confirms your order.",
      },
      {
        q: "Will I get a GST invoice?",
        a: "Yes — a GST invoice is emailed for every purchase. For company (B2B) orders, tick the company option at checkout and enter your company name, address and GSTIN so it prints on the invoice.",
      },
    ],
  },
  {
    title: "Shipping & Delivery",
    items: [
      {
        q: "How long does delivery take?",
        a: "Orders placed before 2:00 PM dispatch the same working day. Standard delivery takes 3–5 working days and Express takes 1–2 working days. Custom 3D prints add their estimated printing time.",
      },
      {
        q: "What are the shipping charges?",
        a: "Standard delivery is FREE above Rs. 999, otherwise a flat charge applies. Express delivery and live courier rates for your pincode are shown at checkout before payment.",
      },
      {
        q: "How do I track my order?",
        a: "You receive an SMS and email with the tracking ID once your order ships, and live status is visible under My Orders in your profile.",
      },
      {
        q: "Do you deliver to my pincode?",
        a: "We deliver across India. Enter your pincode on the product or checkout page to check live serviceability.",
      },
    ],
  },
  {
    title: "3D Printing Service",
    items: [
      {
        q: "Which file format should I upload?",
        a: "We accept .STL, .OBJ, .3MF, .AMF, .PLY, .GLB and .GLTF files up to 100MB. Every file is previewed exactly as-uploaded in the 3D viewer.",
      },
      {
        q: "How is the 3D print price calculated?",
        a: "Final price = Material charge (model weight × per-gram rate of the selected material) + Printing-time charge (estimated print hours × the hourly slab). Weight and time are auto-estimated from your STL file and material the moment you upload.",
      },
      {
        q: "Which materials and colors are available?",
        a: "PLA, PLA+, PLA Matte, PETG, PETG HS, TPU 95A, ABS and ASA, each with its own color palette shown on the 3D printing page. Colors offered can vary per material.",
      },
      {
        q: "What do the infill options mean?",
        a: "Infill is the internal density: 10–20% suits display models, 30–50% suits functional everyday parts, and 100% gives maximum strength for mechanical use. Higher infill uses more material and print time.",
      },
    ],
  },
  {
    title: "Returns & Warranty",
    items: [
      {
        q: "What is your return policy?",
        a: "7-day easy returns: notify us within 2 days of delivery for faulty, incorrect or not-as-specified items. Approved claims are resolved by replacement first; refunds apply when the product is unavailable.",
      },
      {
        q: "Can I return a custom 3D print?",
        a: "Custom prints made to your files cannot be returned unless faulty on arrival. Report issues with photos within 2 days of delivery.",
      },
    ],
  },
];

export default function Faq() {
  const [openKey, setOpenKey] = useState("0-0");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_GROUPS;
    return FAQ_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)
      ),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <div className="policy-page-wrapper">
      <div className="policy-page-container">
        <div className="policy-breadcrumb">
          <Link to="/">Home</Link>
          <span>&gt;</span>
          <span className="policy-breadcrumb-current">FAQs</span>
        </div>

        <div className="policy-layout">
          <aside className="policy-side">
            <Link to="/privacy" className="policy-side-link">Privacy Policy</Link>
            <Link to="/shipping" className="policy-side-link">Shipping Policy</Link>
            <Link to="/terms" className="policy-side-link">Terms &amp; Conditions</Link>
            <Link to="/returns" className="policy-side-link">Return Policy</Link>
            <span className="policy-side-link active">FAQs</span>
          </aside>

          <article className="policy-article">
            <h1>Frequently Asked Questions</h1>
            <p className="policy-updated">Company, orders, shipping, delivery &amp; 3D printing</p>

            <div className="faq-search">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions... (e.g. delivery, GST, STL)"
                aria-label="Search FAQs"
              />
            </div>

            {filtered.length === 0 && (
              <p className="policy-intro">No questions match your search.</p>
            )}

            {filtered.map((group, gi) => (
              <section key={group.title} className="policy-section">
                <h2>{group.title}</h2>
                <div className="faq-list">
                  {group.items.map((item, ii) => {
                    const key = `${gi}-${ii}`;
                    const open = openKey === key;
                    return (
                      <div key={key} className={`faq-item ${open ? "open" : ""}`}>
                        <button
                          type="button"
                          className="faq-question"
                          onClick={() => setOpenKey(open ? "" : key)}
                          aria-expanded={open}
                        >
                          <span>{item.q}</span>
                          <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
                        </button>
                        {open && <p className="faq-answer">{item.a}</p>}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="policy-contact-box">
              <strong>Still stuck?</strong>
              <span>
                Email <a href="mailto:info.printynozzle@gmail.com">info.printynozzle@gmail.com</a> or
                call <a href="tel:+919836609063">9836609063</a> (Mon – Sat, 10 AM – 7 PM).
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
