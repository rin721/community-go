<script setup lang="ts">
import { aoiComponentCategories, getAoiComponentDocs } from "~/data/aoiComponentDocs"
import type { AoiComponentDoc, AoiComponentDocApiRow, AoiComponentDocCategory } from "~/types/docs"

const props = defineProps<{
  category?: AoiComponentDocCategory
}>()

const docs = computed(() => getAoiComponentDocs(props.category))
const categoryMeta = computed(() => props.category
  ? aoiComponentCategories.find((item) => item.id === props.category)
  : undefined)

function emptyText(rows: AoiComponentDocApiRow[]) {
  return rows.length ? "" : "None"
}
</script>

<template>
  <section class="docs-component-api">
    <header v-if="categoryMeta" class="docs-component-api__header">
      <AoiIcon :name="categoryMeta.icon" :size="20" decorative />
      <div>
        <h2>{{ categoryMeta.title }}</h2>
        <p>{{ categoryMeta.description }}</p>
      </div>
    </header>

    <article
      v-for="doc in docs"
      :id="doc.name"
      :key="doc.name"
      class="docs-component-api__item"
    >
      <div class="docs-component-api__item-header">
        <div>
          <p class="docs-component-api__eyebrow">{{ doc.category }}</p>
          <h3>{{ doc.name }}</h3>
          <p>{{ doc.description }}</p>
        </div>
        <code class="docs-component-api__source">
          {{ doc.source }}
        </code>
      </div>

      <DocsComponentDemo :name="doc.name" />

      <div class="docs-component-api__usage">
        <strong>Usage</strong>
        <p>{{ doc.usage }}</p>
      </div>

      <div class="docs-component-api__tables">
        <section>
          <h4>Props</h4>
          <p v-if="emptyText(doc.props)" class="docs-component-api__empty">{{ emptyText(doc.props) }}</p>
          <table v-else>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in doc.props" :key="item.name">
                <td><code>{{ item.name }}</code></td>
                <td><code>{{ item.type }}</code></td>
                <td>{{ item.defaultValue || "-" }}</td>
                <td>{{ item.description }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h4>Events</h4>
          <p v-if="emptyText(doc.events)" class="docs-component-api__empty">{{ emptyText(doc.events) }}</p>
          <table v-else>
            <thead>
              <tr>
                <th>Name</th>
                <th>Payload</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in doc.events" :key="item.name">
                <td><code>{{ item.name }}</code></td>
                <td><code>{{ item.type }}</code></td>
                <td>{{ item.description }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h4>Slots</h4>
          <p v-if="emptyText(doc.slots)" class="docs-component-api__empty">{{ emptyText(doc.slots) }}</p>
          <table v-else>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in doc.slots" :key="item.name">
                <td><code>{{ item.name }}</code></td>
                <td><code>{{ item.type }}</code></td>
                <td>{{ item.description }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <ul v-if="doc.notes.length" class="docs-component-api__notes">
        <li v-for="note in doc.notes" :key="note">{{ note }}</li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.docs-component-api,
.docs-component-api__item,
.docs-component-api__tables {
  display: grid;
  gap: 16px;
}

.docs-component-api {
  margin: 22px 0;
}

.docs-component-api__header,
.docs-component-api__item-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.docs-component-api__item-header {
  grid-template-columns: minmax(0, 1fr) minmax(180px, auto);
}

.docs-component-api__header h2,
.docs-component-api__header p,
.docs-component-api__item h3,
.docs-component-api__item p,
.docs-component-api__eyebrow,
.docs-component-api__usage p {
  margin: 0;
}

.docs-component-api__header h2,
.docs-component-api__item h3 {
  color: var(--aoi-text);
}

.docs-component-api__header p,
.docs-component-api__item p,
.docs-component-api__usage p,
.docs-component-api__empty,
.docs-component-api__notes {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.docs-component-api__item {
  min-width: 0;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-container);
  background: var(--aoi-panel-bg);
  box-shadow: var(--aoi-shadow-sm);
  padding: 18px;
  scroll-margin-top: var(--aoi-settings-anchor-offset);
}

.docs-component-api__eyebrow {
  color: var(--aoi-active-color) !important;
  font-size: 12px;
  font-weight: 820;
  text-transform: uppercase;
}

.docs-component-api__source {
  width: auto;
  justify-self: end;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-control);
  background: var(--aoi-surface-solid);
  color: var(--aoi-text-muted);
  font-size: 12px;
  font-weight: 720;
  padding: 7px 9px;
}

.docs-component-api__usage {
  display: grid;
  gap: 4px;
  border-top: 1px solid var(--aoi-border);
  padding-top: 14px;
}

.docs-component-api__tables section {
  min-width: 0;
  overflow-x: auto;
}

.docs-component-api__tables h4 {
  margin: 0 0 8px;
  color: var(--aoi-text);
  font-size: 14px;
}

.docs-component-api__tables table {
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  background: var(--aoi-surface-solid);
  font-size: 12px;
}

.docs-component-api__tables th,
.docs-component-api__tables td {
  border-bottom: 1px solid var(--aoi-border);
  padding: 9px 10px;
  text-align: left;
  vertical-align: top;
}

.docs-component-api__tables th {
  color: var(--aoi-text);
  font-weight: 820;
}

.docs-component-api__tables td {
  color: var(--aoi-text-muted);
}

.docs-component-api__tables tr:last-child td {
  border-bottom: 0;
}

.docs-component-api__tables code {
  color: var(--aoi-active-color);
}

.docs-component-api__notes {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
}

@media (max-width: 760px) {
  .docs-component-api__item-header {
    grid-template-columns: 1fr;
  }

  .docs-component-api__source {
    justify-self: start;
  }
}
</style>
