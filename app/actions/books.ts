"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { books, readingSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { CreateBookSchema, AddReadingSessionSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function createBook(data: unknown) {
  const user = await getUser();
  const parsed = CreateBookSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const [book] = await db
    .insert(books)
    .values({ ...parsed.data, userId: user.id, challengeId: parsed.data.challengeId ?? null })
    .returning();

  revalidatePath("/books");
  return { book };
}

export async function addReadingSession(data: unknown) {
  const user = await getUser();
  const parsed = AddReadingSessionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Verify book ownership
  const [book] = await db
    .select({ currentPage: books.currentPage, totalPages: books.totalPages })
    .from(books)
    .where(and(eq(books.id, parsed.data.bookId), eq(books.userId, user.id)))
    .limit(1);
  if (!book) return { error: "Book not found" };

  // Insert reading session
  const [session] = await db
    .insert(readingSessions)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  // Update book's current page
  const newPage = Math.min(
    (book.currentPage ?? 0) + parsed.data.pagesRead,
    book.totalPages ?? Infinity
  );
  const isComplete = book.totalPages && newPage >= book.totalPages;

  await db
    .update(books)
    .set({
      currentPage: newPage,
      status: isComplete ? "completed" : "reading",
      startDate: book.currentPage === 0 ? parsed.data.date : undefined,
      completionDate: isComplete ? parsed.data.date : undefined,
    })
    .where(eq(books.id, parsed.data.bookId));

  revalidatePath("/books");
  revalidatePath("/today");
  return { session };
}

export async function getBooks(challengeId?: string) {
  const user = await getUser();
  const supabase = await createClient();
  const query = supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  if (challengeId) query.eq("challenge_id", challengeId);

  const { data } = await query;
  return data ?? [];
}

export async function getBookDetail(bookId: string) {
  const user = await getUser();
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (!book) return null;

  const { data: sessions } = await supabase
    .from("reading_sessions")
    .select("*")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  return { book, sessions: sessions ?? [] };
}

export async function getTodayReadingPages(date: string): Promise<number> {
  const user = await getUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reading_sessions")
    .select("pages_read")
    .eq("user_id", user.id)
    .eq("date", date);
  return (data ?? []).reduce((sum: number, s: any) => sum + s.pages_read, 0);
}
