"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formString, nullableString } from "@/lib/forms";
import {
  addExerciseToRoutine,
  createProgram,
  createRoutine,
  deleteProgram,
  deleteRoutine,
  removeRoutineExercise,
  updateRoutine,
} from "@/lib/db/programs";

export async function createProgramAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = formString(formData, "name");

  if (!name) {
    redirect("/library?error=name-required");
  }

  const program = await createProgram(supabase, user.id, {
    name,
    description: nullableString(formData, "description"),
  });

  revalidatePath("/library");
  redirect(`/library/${program.id}`);
}

export async function deleteProgramAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = formString(formData, "id");

  if (id) {
    await deleteProgram(supabase, user.id, id);
    revalidatePath("/library");
  }

  redirect("/library");
}

export async function createRoutineAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const programId = formString(formData, "program_id");
  const name = formString(formData, "name") || "New routine";

  if (!programId) {
    redirect("/library");
  }

  const routine = await createRoutine(supabase, user.id, programId, name);
  revalidatePath(`/library/${programId}`);
  redirect(`/library/${programId}/${routine.id}`);
}

export async function updateRoutineAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = formString(formData, "id");
  const programId = formString(formData, "program_id");

  if (!id) {
    return;
  }

  await updateRoutine(supabase, user.id, id, {
    name: formString(formData, "name") || undefined,
    description: nullableString(formData, "description"),
  });
  revalidatePath(`/library/${programId}/${id}`);
  revalidatePath(`/library/${programId}`);
}

export async function deleteRoutineAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = formString(formData, "id");
  const programId = formString(formData, "program_id");

  if (id) {
    await deleteRoutine(supabase, user.id, id);
    revalidatePath(`/library/${programId}`);
  }

  redirect(`/library/${programId}`);
}

export async function addExerciseAction(formData: FormData) {
  const { supabase } = await requireUser();
  const templateId = formString(formData, "template_id");
  const exerciseId = formString(formData, "exercise_id");
  const programId = formString(formData, "program_id");
  const search = formString(formData, "search");

  if (templateId && exerciseId) {
    await addExerciseToRoutine(supabase, templateId, exerciseId);
    revalidatePath(`/library/${programId}/${templateId}`);
  }

  redirect(`/library/${programId}/${templateId}${search ? `?${search}` : ""}`);
}

export async function removeRoutineExerciseAction(formData: FormData) {
  const { supabase } = await requireUser();
  const id = formString(formData, "id");
  const templateId = formString(formData, "template_id");
  const programId = formString(formData, "program_id");

  if (id) {
    await removeRoutineExercise(supabase, id);
    revalidatePath(`/library/${programId}/${templateId}`);
  }
}
