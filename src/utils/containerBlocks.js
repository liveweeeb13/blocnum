/**
 * Utility functions for nested container blocks in BlocNum
 */

export function findBlockById(blocks = [], id) {
  if (!id || !Array.isArray(blocks)) return null;
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.type === 'container' && Array.isArray(b.blocks)) {
      const found = findBlockById(b.blocks, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateBlockById(blocks = [], updatedBlock) {
  if (!updatedBlock || !Array.isArray(blocks)) return blocks;
  return blocks.map(b => {
    if (b.id === updatedBlock.id) return updatedBlock;
    if (b.type === 'container' && Array.isArray(b.blocks)) {
      return {
        ...b,
        blocks: updateBlockById(b.blocks, updatedBlock)
      };
    }
    return b;
  });
}

export function deleteBlockById(blocks = [], id) {
  if (!id || !Array.isArray(blocks)) return blocks;
  return blocks
    .filter(b => b.id !== id)
    .map(b => {
      if (b.type === 'container' && Array.isArray(b.blocks)) {
        return {
          ...b,
          blocks: deleteBlockById(b.blocks, id)
        };
      }
      return b;
    });
}

export function findParentContainer(blocks = [], id) {
  if (!id || !Array.isArray(blocks)) return null;
  for (const b of blocks) {
    if (b.type === 'container' && Array.isArray(b.blocks)) {
      if (b.blocks.some(child => child.id === id)) return b;
      const found = findParentContainer(b.blocks, id);
      if (found) return found;
    }
  }
  return null;
}

export function addChildToContainer(blocks = [], containerId, childBlock) {
  if (!containerId || !childBlock || !Array.isArray(blocks)) return blocks;
  return blocks.map(b => {
    if (b.id === containerId) {
      const currentBlocks = Array.isArray(b.blocks) ? b.blocks : [];
      return {
        ...b,
        blocks: [...currentBlocks, childBlock]
      };
    }
    if (b.type === 'container' && Array.isArray(b.blocks)) {
      return {
        ...b,
        blocks: addChildToContainer(b.blocks, containerId, childBlock)
      };
    }
    return b;
  });
}

export function moveBlockInLayout(blocks = [], blockId, direction = 'up') {
  if (!blockId || !Array.isArray(blocks)) return blocks;

  // 1. Check if at root
  const rootIndex = blocks.findIndex(b => b.id === blockId);
  if (rootIndex !== -1) {
    const targetIndex = direction === 'up' ? rootIndex - 1 : rootIndex + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return blocks;
    const newBlocks = [...blocks];
    const temp = newBlocks[rootIndex];
    newBlocks[rootIndex] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    return newBlocks;
  }

  // 2. Check within nested containers
  return blocks.map(b => {
    if (b.type === 'container' && Array.isArray(b.blocks)) {
      const childIndex = b.blocks.findIndex(c => c.id === blockId);
      if (childIndex !== -1) {
        const targetIndex = direction === 'up' ? childIndex - 1 : childIndex + 1;
        if (targetIndex < 0 || targetIndex >= b.blocks.length) return b;
        const newChildBlocks = [...b.blocks];
        const temp = newChildBlocks[childIndex];
        newChildBlocks[childIndex] = newChildBlocks[targetIndex];
        newChildBlocks[targetIndex] = temp;
        return { ...b, blocks: newChildBlocks };
      }
      return { ...b, blocks: moveBlockInLayout(b.blocks, blockId, direction) };
    }
    return b;
  });
}

export function extractBlockFromContainer(blocks = [], blockId) {
  if (!blockId || !Array.isArray(blocks)) return blocks;
  let extractedBlock = null;

  const removeRecursive = (list) => {
    return list.map(b => {
      if (b.type === 'container' && Array.isArray(b.blocks)) {
        const found = b.blocks.find(c => c.id === blockId);
        if (found) {
          extractedBlock = found;
          return { ...b, blocks: b.blocks.filter(c => c.id !== blockId) };
        }
        return { ...b, blocks: removeRecursive(b.blocks) };
      }
      return b;
    });
  };

  const newBlocks = removeRecursive(blocks);
  if (extractedBlock) {
    const parentContainer = findParentContainer(blocks, blockId);
    const parentIdx = newBlocks.findIndex(b => b.id === parentContainer?.id);
    if (parentIdx !== -1) {
      newBlocks.splice(parentIdx + 1, 0, extractedBlock);
    } else {
      newBlocks.push(extractedBlock);
    }
  }
  return newBlocks;
}

