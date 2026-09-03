import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getBooks } from "@/app/actions/books";
import { getCurrentChallenge } from "@/app/actions/challenges";
import { Plus, BookOpen } from "lucide-react";

export const metadata = { title: "Books" };

export default async function BooksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const challenge = await getCurrentChallenge();
  const books = await getBooks(challenge?.id);

  const reading = books.filter((b: any) => b.status === "reading");
  const toRead = books.filter((b: any) => b.status === "to_read");
  const done = books.filter((b: any) => b.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>BOOKS</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {reading.length} reading · {done.length} completed
          </p>
        </div>
        <Link href="/books/add" className="btn btn-ghost text-xs gap-1.5">
          <Plus size={12} /> ADD
        </Link>
      </div>

      {books.length === 0 && (
        <div className="py-16 text-center">
          <BookOpen size={32} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>No books tracked yet.</p>
          <Link href="/books/add" className="btn btn-primary text-sm px-6 inline-flex">
            Add first book
          </Link>
        </div>
      )}

      {reading.length > 0 && (
        <Section title="CURRENTLY READING">
          {reading.map((b: any) => <BookCard key={b.id} book={b} />)}
        </Section>
      )}

      {toRead.length > 0 && (
        <Section title="TO READ">
          {toRead.map((b: any) => <BookCard key={b.id} book={b} />)}
        </Section>
      )}

      {done.length > 0 && (
        <Section title="COMPLETED">
          {done.map((b: any) => <BookCard key={b.id} book={b} />)}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="section-header">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function BookCard({ book }: { book: any }) {
  const pct =
    book.total_pages && book.current_page
      ? Math.min(100, Math.round((book.current_page / book.total_pages) * 100))
      : 0;

  return (
    <Link
      href={`/books/${book.id}`}
      className="card flex items-center gap-3 px-4 py-3 interactive-row block"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {book.title}
        </p>
        {book.author && (
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {book.author}
          </p>
        )}
        {book.status === "reading" && book.total_pages && (
          <div className="mt-1.5">
            <div className="progress-track h-0.5 w-full">
              <div className="progress-fill h-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] mt-0.5 text-data" style={{ color: "var(--text-muted)" }}>
              {book.current_page} / {book.total_pages} pages · {pct}%
            </p>
          </div>
        )}
      </div>
      <span
        className="text-[10px] font-semibold tracking-widest flex-shrink-0"
        style={{
          color:
            book.status === "reading" ? "var(--accent)" :
            book.status === "completed" ? "var(--success)" :
            "var(--text-muted)",
        }}
      >
        {book.status === "reading" ? "READING" : book.status === "completed" ? "DONE" : ""}
      </span>
    </Link>
  );
}
