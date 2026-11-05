import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_MISSION_UPLOAD_BYTES,
  MAX_MISSION_UPLOADS,
  validateMissionFiles,
} from '../src/features/roadmap/services/roadmap_upload_store.js';

const file = (name, type, size = 1024) => ({ name, type, size });

test('mission uploads accept supported documents and images within limits', () => {
  assert.equal(MAX_MISSION_UPLOADS, 5);
  assert.equal(MAX_MISSION_UPLOAD_BYTES, 10 * 1024 * 1024);
  assert.equal(validateMissionFiles([
    file('notes.pdf', 'application/pdf'),
    file('prototype.png', 'image/png'),
    file('outline.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    file('worksheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    file('readme.txt', 'text/plain', MAX_MISSION_UPLOAD_BYTES),
  ]), '');
});

test('mission uploads reject missing, excessive, empty, oversized and unsupported files', () => {
  assert.match(validateMissionFiles([]), /Upload at least one/);
  assert.match(validateMissionFiles(Array.from({ length: 6 }, (_, index) => file(`${index}.pdf`, 'application/pdf'))), /up to 5 files/);
  assert.match(validateMissionFiles([file('empty.pdf', 'application/pdf', 0)]), /empty/);
  assert.match(validateMissionFiles([file('large.pdf', 'application/pdf', MAX_MISSION_UPLOAD_BYTES + 1)]), /10 MB/);
  assert.match(validateMissionFiles([file('script.svg', 'image/svg+xml')]), /not a supported/);
  assert.match(validateMissionFiles([file('mismatch.pdf', 'image/png')]), /not a supported/);
});
