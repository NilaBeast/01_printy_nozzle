import React from "react";
import { Link } from "react-router-dom";
// import footerData from "../data/footer.json";
import "../../public/css/footer.css";

let footerData = {
  "brand": {
    "logo": "/images/logo.png",
    "name": "PrintyNozzle",
    "description": "Print. Build. Innovate. Quality 3D printing solutions, components, and electronics for makers and creators."
  },

  "columns": [
    {
      "title": "Shop",
      "links": [
        {
          "label": "All Products",
          "url": "/products"
        },
        {
          "label": "New Arrivals",
          "url": "/products?filter=new"
        },
        {
          "label": "Best Sellers",
          "url": "/products?filter=bestsellers"
        },
        {
          "label": "Offers",
          "url": "/offers"
        }
      ]
    },
    {
      "title": "3D Printing",
      "links": [
        {
          "label": "How It Works",
          "url": "/3d-printing"
        },
        {
          "label": "Materials",
          "url": "/materials"
        },
        {
          "label": "Upload & Print",
          "url": "/upload-print"
        },
        {
          "label": "Bulk Order",
          "url": "/bulk-order"
        }
      ]
    },
    {
      "title": "Customer Service",
      "links": [
        {
          "label": "Contact Us",
          "url": "/contact"
        },
        {
          "label": "Shipping Policy",
          "url": "/shipping"
        },
        {
          "label": "Return Policy",
          "url": "/returns"
        },
        {
          "label": "FAQs",
          "url": "/faqs"
        }
      ]
    },
    {
      "title": "Company",
      "links": [
        {
          "label": "About Us",
          "url": "/about"
        },
        {
          "label": "Blog",
          "url": "/blog"
        },
        {
          "label": "Terms & Conditions",
          "url": "/terms"
        },
        {
          "label": "Privacy Policy",
          "url": "/privacy"
        }
      ]
    }
  ],

  "newsletter": {
    "title": "Stay in the loop",
    "description": "Get updates on new products, 3D printing services, offers and more.",
    "placeholder": "Enter your email",
    "button": "Subscribe"
  },

  "socials": [
    {
      "name": "Facebook",
      "icon": "f",
      "url": "#"
    },
    {
      "name": "Instagram",
      "icon": "◎",
      "url": "#"
    },
    {
      "name": "YouTube",
      "icon": "▶",
      "url": "#"
    },
    {
      "name": "GitHub",
      "icon": "⌘",
      "url": "#"
    }
  ],

  "payments": [
    "VISA",
    "Mastercard",
    "UPI",
    "RuPay"
  ],

  "copyright": "PrintyNozzle. All rights reserved."
}

function Footer() {
  return (
    <footer className="pn-footer">

      {/* Decorative glow */}
      <div className="pn-footer-glow"></div>

      <div className="pn-footer-container">

        {/* ================= BRAND ================= */}
        <div className="pn-footer-brand">

          <Link to="/" className="pn-footer-logo">
            <img
              src={footerData.brand.logo}
              alt={footerData.brand.name}
            />
          </Link>

          <p>{footerData.brand.description}</p>

          <div className="pn-socials">
            {footerData.socials.map((social) => (
              <a
                key={social.name}
                href={social.url}
                aria-label={social.name}
              >
                {social.icon}
              </a>
            ))}
          </div>

        </div>


        {/* ================= FOOTER COLUMNS ================= */}
        {footerData.columns.map((column) => (
          <div
            className="pn-footer-column"
            key={column.title}
          >
            <h4>{column.title}</h4>

            <div className="pn-footer-links">
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.url}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}


        {/* ================= NEWSLETTER ================= */}
        <div className="pn-footer-newsletter">

          <h4>{footerData.newsletter.title}</h4>

          <p>
            {footerData.newsletter.description}
          </p>

          <form className="pn-newsletter-form">

            <input
              type="email"
              placeholder={footerData.newsletter.placeholder}
              aria-label="Email address"
            />

            <button type="submit">
              {footerData.newsletter.button}
            </button>

          </form>

          <small>
            No spam. Unsubscribe anytime.
          </small>

        </div>

      </div>


      {/* ================= FOOTER BOTTOM ================= */}
      <div className="pn-footer-bottom">

        <p>
          © {new Date().getFullYear()}{" "}
          {footerData.copyright}
        </p>


        <div className="pn-payment-methods">

          {footerData.payments.map((payment) => (
            <span
              key={payment}
              className={
                payment.toLowerCase() === "mastercard"
                  ? "pn-mastercard"
                  : ""
              }
            >

              {payment === "Mastercard" && (
                <span className="pn-card-circles">
                  <i></i>
                  <i></i>
                </span>
              )}

              {payment}

            </span>
          ))}

        </div>

      </div>

    </footer>
  );
}

export default Footer;