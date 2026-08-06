export const PROPERTY_INDEX_ALIAS = 'properties';
export const PROPERTY_INDEX_VERSION = 'v2';
export const PROPERTY_INDEX_NAME = `properties_${PROPERTY_INDEX_VERSION}`;

export const PROPERTY_INDEX_DEFINITION = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        autocomplete: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'edge_ngram_filter'],
        },
      },
      filter: {
        edge_ngram_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 15,
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      slug: { type: 'keyword' },
      hostId: { type: 'keyword' },
      status: { type: 'keyword' },

      title: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'standard',
      },
      description: { type: 'text' },

      city: { type: 'keyword', fields: { text: { type: 'text' } } },
      state: { type: 'keyword' },
      country: { type: 'keyword' },
      addressLine1: { type: 'text' },
      location: { type: 'geo_point' },

      propertyType: { type: 'keyword' },

      basePrice: { type: 'float' },
      currency: { type: 'keyword' },
      cleaningFee: { type: 'float' },

      maxGuests: { type: 'integer' },
      bedrooms: { type: 'integer' },
      beds: { type: 'integer' },
      bathrooms: { type: 'float' },

      amenities: { type: 'keyword' },
      amenitySlugs: { type: 'keyword' },

      rating: { type: 'float' },
      totalReviews: { type: 'integer' },

      coverImage: { type: 'keyword', index: false },
      thumbnailUrl: { type: 'keyword', index: false },

      instantBook: { type: 'boolean' },
      minNights: { type: 'integer' },
      maxNights: { type: 'integer' },
      cancellationPolicy: { type: 'keyword' },

      blockedRanges: {
        type: 'nested',
        properties: {
          from: { type: 'date' },
          to: { type: 'date' },
        },
      },

      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
};
