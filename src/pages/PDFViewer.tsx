import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Search, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl?: string;
  pdfFile?: File;
}

export default function PDFViewer({ pdfUrl, pdfFile }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [searchText, setSearchText] = useState('');
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const toggleBookmark = () => {
    setBookmarks(prev =>
      prev.includes(pageNumber)
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber]
    );
  };

  const goToBookmark = (page: number) => {
    setPageNumber(page);
  };

  const handleSearch = () => {
    // Basic search implementation - in a real app, you'd use PDF.js text content extraction
    console.log('Searching for:', searchText);
  };

  if (!pdfUrl && !pdfFile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">No PDF provided</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {pageNumber} of {numPages}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= (numPages || 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search in PDF..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full md:w-48"
            />
            <Button variant="outline" size="sm" onClick={handleSearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleBookmark}
            className={bookmarks.includes(pageNumber) ? 'bg-primary text-primary-foreground' : ''}
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm font-medium">Bookmarks:</span>
            {bookmarks.map(page => (
              <Button
                key={page}
                variant="outline"
                size="sm"
                onClick={() => goToBookmark(page)}
              >
                Page {page}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      <div className="flex justify-center p-4 max-w-full overflow-hidden">
        <Document
          file={pdfFile || pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="text-center py-8">Loading PDF...</div>}
          error={<div className="text-center py-8 text-destructive">Error loading PDF</div>}
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="max-w-full"
          />
        </Document>
      </div>
    </div>
  );
}