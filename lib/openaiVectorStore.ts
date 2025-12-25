import OpenAI from 'openai';

type VectorStoreRow = { vector_store_id?: string | null };

type Awaitable<T> = PromiseLike<T>;

export type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle?: () => Awaitable<{ data: VectorStoreRow | null; error?: unknown }>;
        single?: () => Awaitable<{ data: VectorStoreRow | null; error?: unknown }>;
      };
    };
    insert: (values: { user_id: string; vector_store_id: string }) => Awaitable<{ error?: unknown | null }>;
  };
};

const TABLE = 'user_vector_stores';

export async function getOrCreateUserVectorStoreId(params: {
  openai: OpenAI;
  supabase: SupabaseLike;
  userId: string;
}): Promise<string> {
  const { openai, supabase, userId } = params;

  // 1) Try existing mapping
  try {
    const q = supabase
      .from(TABLE)
      .select('vector_store_id')
      .eq('user_id', userId);

    const { data } =
      typeof q.maybeSingle === 'function'
        ? await q.maybeSingle()
        : typeof q.single === 'function'
          ? await q.single()
          : { data: null };
    const existing = (data?.vector_store_id as string | undefined) || '';
    if (existing) return existing;
  } catch {
    // ignore (not found / table not created yet)
  }

  // 2) Create new vector store
  const vs = await openai.vectorStores.create({
    name: `kb-${userId}`,
  });

  // 3) Persist mapping (handle race by re-reading)
  try {
    const { error } = await supabase.from(TABLE).insert({
      user_id: userId,
      vector_store_id: vs.id,
    });
    if (!error) return vs.id;
  } catch {
    // ignore
  }

  // If insert raced, read again
  const q2 = supabase.from(TABLE).select('vector_store_id').eq('user_id', userId);
  const { data: data2 } =
    typeof q2.maybeSingle === 'function'
      ? await q2.maybeSingle()
      : typeof q2.single === 'function'
        ? await q2.single()
        : { data: null };
  const existing2 = (data2?.vector_store_id as string | undefined) || '';
  return existing2 || vs.id;
}

export async function addFileToVectorStore(params: {
  openai: OpenAI;
  vectorStoreId: string;
  file: File;
}): Promise<{ openaiFileId: string; batchId: string }>
{
  const { openai, vectorStoreId, file } = params;

  const uploaded = await openai.files.create({
    file,
    purpose: 'assistants',
  });

  const batch = await openai.vectorStores.fileBatches.create(vectorStoreId, {
    file_ids: [uploaded.id],
  });

  return { openaiFileId: uploaded.id, batchId: batch.id };
}
