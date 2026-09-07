import * as React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-12 px-4 md:px-8 border-t border-(--border) bg-(--background) mt-auto">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <h3 className="font-(--font-marquee) text-lg tracking-wide">MOVIETICK</h3>
          <p className="text-sm text-(--muted-foreground) max-w-xs">
            The premium destination for booking your favourite movies, events,
            and experiences.
          </p>
          
        </div>

        <div>
          <h4 className="font-semibold mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-(--muted-foreground)">
            <li>
              <Link
                href="#"
                className="hover:text-(--foreground) transition-colors"
              >
                Help Center
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="hover:text-(--foreground) transition-colors"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="hover:text-(--foreground) transition-colors"
              >
                Cancellation Policy
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="hover:text-(--foreground) transition-colors"
              >
                FAQs
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm text-(--muted-foreground)">
            <li>
              <Link
                href="/"
                className="hover:text-(--foreground) transition-colors"
              >
                Now Showing
              </Link>
            </li>
            <li>
              <Link
                href="/"
                className="hover:text-(--foreground) transition-colors"
              >
                Coming Soon
              </Link>
            </li>
            <li>
              <Link
                href="/theatres"
                className="hover:text-(--foreground) transition-colors"
              >
                Theatres
              </Link>
            </li>
            <li>
              <Link
                href="/offers"
                className="hover:text-(--foreground) transition-colors"
              >
                Offers & Promos
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm text-(--muted-foreground)">
            <li>
              <Link
                href="#"
                className="hover:text-(--foreground) transition-colors"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="hover:text-(--foreground) transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto mt-12 pt-8 border-t border-(--border) flex flex-col md:flex-row items-center justify-between text-sm text-(--muted-foreground)">
        <p>© {new Date().getFullYear()} MovieTick. All rights reserved.</p>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <Link href="#" className="hover:text-(--foreground)">
            Twitter
          </Link>
          <Link href="#" className="hover:text-(--foreground)">
            Instagram
          </Link>
          <Link href="#" className="hover:text-(--foreground)">
            Facebook
          </Link>
        </div>
      </div>
    </footer>
  );
}
