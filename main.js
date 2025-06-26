const svg = d3.select("#graph");
const width = window.innerWidth;
const height = window.innerHeight;
svg.attr("width", width).attr("height", height);

const tooltip = d3.select("#tooltip");
const container = svg.append("g");

const color = d3.scaleOrdinal()
  .domain(["company", "driver", "anti"])
  .range(["#1f77b4", "#2ca02c", "#d62728"]);

const simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(d => d.id).distance(160))
  .force("charge", d3.forceManyBody().strength(-800))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide(45));

// Load data from external JSON
d3.json("data.json").then(data => {
  const { nodes, links } = data;

  const companies = nodes.filter(d => d.group === "company").map(d => d.id);
  const select = d3.select("#companySelect");

  // Populate dropdown menu
  companies.forEach(c => {
    select.append("option").attr("value", c).text(c);
  });

  select.on("change", function () {
    const selected = this.value;
    const filteredLinks = selected === "ALL"
      ? links
      : links.filter(l =>
          (typeof l.source === "string" ? l.source : l.source.id) === selected
        );
    render(filteredLinks);
  });

  // Initial render with all links
  render(links);

  function render(activeLinks) {
    const activeNodeIDs = new Set();
    activeLinks.forEach(l => {
      activeNodeIDs.add(typeof l.source === "object" ? l.source.id : l.source);
      activeNodeIDs.add(typeof l.target === "object" ? l.target.id : l.target);
    });

    const visibleNodes = nodes.filter(n => activeNodeIDs.has(n.id));
    simulation.nodes(visibleNodes);
    simulation.force("link").links(activeLinks);
    simulation.alpha(1).restart();

    const link = container.selectAll("line")
      .data(activeLinks, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
      .join("line")
      .attr("stroke", d => {
        const targetID = typeof d.target === "object" ? d.target.id : d.target;
        const targetGroup = nodes.find(n => n.id === targetID)?.group;
        return targetGroup === "anti" ? "#d62728" : "#2ca02c";
      })
      .attr("stroke-width", d => Math.sqrt(Math.abs(d.value)))
      .attr("stroke-opacity", 0.6);

    const node = container.selectAll("circle")
      .data(visibleNodes, d => d.id)
      .join("circle")
      .attr("r", 10)
      .attr("fill", d => color(d.group))
      .call(drag(simulation))
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(100).style("opacity", 0.9);
        tooltip.html(`<strong>${d.id}</strong><br>Type: ${d.group}`)
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(300).style("opacity", 0);
      });

    const label = container.selectAll("text")
      .data(visibleNodes, d => d.id)
      .join("text")
      .text(d => d.id)
      .attr("dx", 12)
      .attr("dy", "0.35em")
      .style("font-size", "12px");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
  }
});

function drag(simulation) {
  return d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}

