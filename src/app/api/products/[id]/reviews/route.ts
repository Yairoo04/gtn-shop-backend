import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '~/app/lib/mssql';
import { verifyToken } from '~/app/utils/jwt';
import { promises as fs } from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'public/uploads/reviews');

type ReviewRow = {
  ReviewId: number;
  ProductId: number;
  UserId: number;
  FullName: string | null;
  Username: string | null;
  Rating: number;
  Comment: string | null;
  CreatedAt: string;
  UpdatedAt: string | null;
  IsEdited: boolean;
  ImagesJson: string | null;
};

type SummaryRow = {
  TotalReviews: number | null;
  AverageRating: number | null;
  Star5: number | null;
  Star4: number | null;
  Star3: number | null;
  Star2: number | null;
  Star1: number | null;
};

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function mapSummary(summary: SummaryRow | null) {
  if (!summary) {
    return {
      totalReviews: 0,
      averageRating: 0,
      star5: 0,
      star4: 0,
      star3: 0,
      star2: 0,
      star1: 0,
    };
  }
  return {
    totalReviews: summary.TotalReviews ?? 0,
    averageRating: summary.AverageRating ?? 0,
    star5: summary.Star5 ?? 0,
    star4: summary.Star4 ?? 0,
    star3: summary.Star3 ?? 0,
    star2: summary.Star2 ?? 0,
    star1: summary.Star1 ?? 0,
  };
}

function getRecordsets(res: sql.IResult<any>): sql.IRecordSet<any>[] {
  const rs = res.recordsets;
  if (Array.isArray(rs)) return rs as sql.IRecordSet<any>[];
  return Object.values(rs) as sql.IRecordSet<any>[];
}

async function uploadImage(file: File, reviewId: number, index: number) {
  const mime = file.type;
  const ext = MIME_EXT_MAP[mime] ?? '.jpg';

  const filename = `review_${reviewId}_${index}_${Date.now()}${ext}`;
  const filePath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  // Nếu cần xoá EXIF/resize thì xử lý filePath ở đây bằng thư viện như sharp

  return `/uploads/reviews/${filename}`;
}

/* GET /api/products/:id/reviews */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const productId = Number(id);

  if (!Number.isInteger(productId)) {
    return NextResponse.json(
      { success: false, message: 'Invalid product id' },
      { status: 400 },
    );
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('ProductId', sql.Int, productId)
      .execute('GetProductReviews');

    const recordsets = getRecordsets(result);
    const reviewsRs = recordsets[0] as sql.IRecordSet<ReviewRow> | undefined;
    const summaryRs = recordsets[1] as sql.IRecordSet<SummaryRow> | undefined;

    const reviews: ReviewRow[] = reviewsRs ? [...reviewsRs] : [];
    const summaryRow: SummaryRow | null = summaryRs?.[0] ?? null;

    return NextResponse.json(
      {
        success: true,
        data: {
          reviews: reviews.map((r) => ({
            id: r.ReviewId,
            productId: r.ProductId,
            userId: r.UserId,
            authorName: r.FullName || r.Username || 'Khách hàng',
            rating: r.Rating,
            comment: r.Comment,
            createdAt: r.CreatedAt,
            updatedAt: r.UpdatedAt,
            isEdited: r.IsEdited,
            images: r.ImagesJson
              ? JSON.parse(r.ImagesJson).map(
                  (i: { ImageUrl: string }) => i.ImageUrl,
                )
              : [],
          })),
          summary: mapSummary(summaryRow),
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('GetProductReviews error', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}

/* POST /api/products/:id/reviews */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const productId = Number(id);

  if (!Number.isInteger(productId)) {
    return NextResponse.json(
      { success: false, message: 'Invalid product id' },
      { status: 400 },
    );
  }

  const formData = await req.formData();
  const ratingStr = formData.get('rating') as string | null;
  const comment = (formData.get('comment') as string | null)?.trim() || null;
  const imageFiles = formData.getAll('images') as File[];

  if (!ratingStr) {
    return NextResponse.json(
      { success: false, message: 'Missing rating' },
      { status: 400 },
    );
  }

  const rating = Math.trunc(Number(ratingStr));
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { success: false, message: 'Rating must be from 1 to 5' },
      { status: 400 },
    );
  }

  // Kiểm tra số lượng, dung lượng, kiểu file ảnh
  if (imageFiles.length > MAX_IMAGES) {
    return NextResponse.json(
      {
        success: false,
        message: `Bạn chỉ được tải lên tối đa ${MAX_IMAGES} ảnh.`,
      },
      { status: 400 },
    );
  }

  for (const file of imageFiles) {
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mỗi ảnh tối đa 2MB.',
        },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP.',
        },
        { status: 400 },
      );
    }
  }

  const authHeader =
    req.headers.get('authorization') ?? req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Unauthenticated' },
      { status: 401 },
    );
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return NextResponse.json(
      { success: false, message: 'Invalid token' },
      { status: 401 },
    );
  }

  const userId = decoded.userId;

  try {
    await fs.mkdir(uploadDir, { recursive: true });

    const pool = await getPool();

    // Thêm/cập nhật review (không bao gồm ảnh)
    await pool
      .request()
      .input('ProductId', sql.Int, productId)
      .input('UserId', sql.Int, userId)
      .input('Rating', sql.TinyInt, rating)
      .input('Comment', sql.NVarChar(1000), comment)
      .execute('AddOrUpdateProductReview');

    // Lấy ReviewId
    const reviewIdRes = await pool
      .request()
      .input('ProductId', sql.Int, productId)
      .input('UserId', sql.Int, userId)
      .query(
        'SELECT ReviewId FROM dbo.ProductReviews WHERE ProductId = @ProductId AND UserId = @UserId AND IsActive = 1',
      );

    const reviewId = reviewIdRes.recordset[0]?.ReviewId;
    if (!reviewId) {
      throw new Error('Failed to get review ID');
    }

    // Xóa ảnh cũ trong DB
    await pool
      .request()
      .input('ReviewId', sql.Int, reviewId)
      .query('DELETE FROM dbo.ReviewImages WHERE ReviewId = @ReviewId');

    // Upload và insert ảnh mới
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      if (file.size > 0) {
        const url = await uploadImage(file, reviewId, i);
        await pool
          .request()
          .input('ReviewId', sql.Int, reviewId)
          .input('ImageUrl', sql.NVarChar(500), url)
          .query(
            'INSERT INTO dbo.ReviewImages (ReviewId, ImageUrl) VALUES (@ReviewId, @ImageUrl)',
          );
      }
    }

    // Lấy data mới sau khi cập nhật
    const result = await pool
      .request()
      .input('ProductId', sql.Int, productId)
      .execute('GetProductReviews');

    const recordsets = getRecordsets(result);
    const reviewsRs = recordsets[0] as sql.IRecordSet<ReviewRow> | undefined;
    const summaryRs = recordsets[1] as sql.IRecordSet<SummaryRow> | undefined;

    const reviews: ReviewRow[] = reviewsRs ? [...reviewsRs] : [];
    const summaryRow: SummaryRow | null = summaryRs?.[0] ?? null;

    return NextResponse.json(
      {
        success: true,
        data: {
          reviews: reviews.map((r) => ({
            id: r.ReviewId,
            productId: r.ProductId,
            userId: r.UserId,
            authorName: r.FullName || r.Username || 'Khách hàng',
            rating: r.Rating,
            comment: r.Comment,
            createdAt: r.CreatedAt,
            updatedAt: r.UpdatedAt,
            isEdited: r.IsEdited,
            images: r.ImagesJson
              ? JSON.parse(r.ImagesJson).map(
                  (i: { ImageUrl: string }) => i.ImageUrl,
                )
              : [],
          })),
          summary: mapSummary(summaryRow),
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('AddOrUpdateProductReview error', err);
    const status =
      err?.code === 'EREQUEST'
        ? 400
        : 500;
    return NextResponse.json(
      {
        success: false,
        message: err?.message ?? 'Internal server error',
      },
      { status },
    );
  }
}
